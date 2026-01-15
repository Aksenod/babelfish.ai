import * as onnxCommon from 'onnxruntime-common';

// Load onnxruntime-common UMD bundle to expose `self.ort`
// onnxruntime-web UMD build relies on this global.
import 'onnxruntime-common/dist/ort-common.min.js';

const onnxCommonModule = onnxCommon.default ?? onnxCommon;

// Ensure self.ort is available before onnxruntime-web loads
if (!self.ort || typeof self.ort.registerBackend !== 'function') {
    self.ort = onnxCommonModule;
}
console.log('[TRANSCRIPTION:worker] onnxruntime-common loaded:', {
    hasOrtGlobal: !!self.ort,
    hasRegisterBackend: typeof self.ort?.registerBackend === 'function',
});

// Pre-import onnxruntime-web to ensure it's loaded before transformers
// This allows transformers to properly initialize the WASM backend
let ortWebModule = null;
import('onnxruntime-web').then((ortWeb) => {
    ortWebModule = ortWeb.default || ortWeb;
    console.log('[TRANSCRIPTION:worker] onnxruntime-web pre-loaded');
}).catch((err) => {
    console.warn('[TRANSCRIPTION:worker] Failed to pre-load onnxruntime-web:', err.message);
});

// Initialize WASM backend before loading transformers
let wasmBackendInitialized = false;
async function initializeWasmBackend() {
    if (wasmBackendInitialized) return;
    
    try {
        // Ensure ort is available and set WASM options
        // Transformers will handle the actual WASM backend import
        if (self.ort) {
            // Set WASM configuration
            if (!self.ort.env) {
                self.ort.env = {};
            }
            if (!self.ort.env.wasm) {
                self.ort.env.wasm = {};
            }
            self.ort.env.wasm.numThreads = 1;
            self.ort.env.wasm.simd = false;
            
            console.log('[TRANSCRIPTION:worker] WASM backend configuration set:', {
                numThreads: self.ort.env.wasm.numThreads,
                simd: self.ort.env.wasm.simd,
            });
        }
        
        wasmBackendInitialized = true;
    } catch (error) {
        console.warn('[TRANSCRIPTION:worker] Could not initialize WASM backend configuration:', error.message);
        // Continue - transformers should handle it
    }
}

// Intercept fetch requests to debug model loading issues
const originalFetch = self.fetch;
self.fetch = async function (...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('huggingface.co')) {
        console.log('[TRANSCRIPTION:worker] Fetch request to:', url);
        try {
            const response = await originalFetch.apply(this, args);
            const clonedResponse = response.clone();
            const text = await clonedResponse.text();
            console.log('[TRANSCRIPTION:worker] Response status:', response.status);
            console.log('[TRANSCRIPTION:worker] Response headers:', Object.fromEntries(response.headers.entries()));
            console.log('[TRANSCRIPTION:worker] Response preview (first 200 chars):', text.substring(0, 200));
            if (!response.ok || text.trim().startsWith('<!DOCTYPE')) {
                console.error('[TRANSCRIPTION:worker] Error: Got HTML instead of JSON!');
            }
            // Return a new response with the text we read
            return new Response(text, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            });
        } catch (error) {
            console.error('[TRANSCRIPTION:worker] Fetch error:', error);
            throw error;
        }
    }
    return originalFetch.apply(this, args);
};

let AutoTokenizer;
let AutoProcessor;
let WhisperForConditionalGeneration;
let env;
let transformersLoaded = false;

const configureTransformersEnv = () => {
    // Configure environment for web worker BEFORE any other operations
    env.allowLocalModels = false;
    env.useBrowserCache = false; // Disable cache to avoid stale HTML responses
    env.allowRemoteModels = true;
    
    // Set default device to WASM for worker environment
    env.device = 'wasm';

    // Initialize backends structure
    if (!env.backends) {
        env.backends = {};
    }
    if (!env.backends.onnx) {
        env.backends.onnx = {};
    }
    
    // Configure WASM backend options
    env.backends.onnx.wasm = {
        numThreads: 1,
        simd: false, // Disable SIMD for compatibility
        proxy: false,
    };
    
    // Also set in ort.env if available
    if (self.ort && self.ort.env) {
        if (!self.ort.env.wasm) {
            self.ort.env.wasm = {};
        }
        self.ort.env.wasm.numThreads = 1;
        self.ort.env.wasm.simd = false;
    }
    
    // Ensure backend is available
    console.log('[TRANSCRIPTION:worker] Transformers env configured:', {
        device: env.device,
        backends: env.backends,
        allowRemoteModels: env.allowRemoteModels,
        ortEnvWasm: self.ort?.env?.wasm,
    });

    // Configure custom fetch function to add proper headers and handle CORS
    env.customFetch = async (url, init = {}) => {
        console.log('[TRANSCRIPTION:worker] Custom fetch to:', url);

        // Add proper headers for JSON requests
        const headers = new Headers(init.headers || {});
        headers.set('Accept', 'application/json');
        headers.set('Content-Type', 'application/json');

        const fetchInit = {
            ...init,
            headers,
            cache: 'no-store', // Disable cache
            mode: 'cors', // Enable CORS
        };

        try {
            const response = await fetch(url, fetchInit);
            const clonedResponse = response.clone();
            const text = await clonedResponse.text();

            console.log('[TRANSCRIPTION:worker] Response status:', response.status);
            console.log('[TRANSCRIPTION:worker] Response preview:', text.substring(0, 200));

            if (!response.ok) {
                console.error('[TRANSCRIPTION:worker] Response not OK:', response.status, response.statusText);
            }

            if (text.trim().startsWith('<!DOCTYPE')) {
                console.error('[TRANSCRIPTION:worker] Got HTML instead of JSON!');
                throw new Error('Received HTML instead of JSON. This may be a CORS issue or incorrect URL.');
            }

            // Return a new response with the text we read
            return new Response(text, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            });
        } catch (error) {
            console.error('[TRANSCRIPTION:worker] Fetch error:', error);
            throw error;
        }
    };

    console.log('[TRANSCRIPTION:worker] Model loading configured with custom fetch');
};

const loadTransformers = async () => {
    if (transformersLoaded) {
        return;
    }

    const transformers = await import('@xenova/transformers');
    AutoTokenizer = transformers.AutoTokenizer;
    AutoProcessor = transformers.AutoProcessor;
    WhisperForConditionalGeneration = transformers.WhisperForConditionalGeneration;
    env = transformers.env;

    configureTransformersEnv();
    transformersLoaded = true;
};

// ONNX Runtime will be initialized automatically by @xenova/transformers
// We don't need to import it directly - the library handles it
let onnxRuntimeInitialized = false;

async function initializeOnnxRuntime() {
    if (onnxRuntimeInitialized) return;

    // Initialize WASM backend before loading transformers
    await initializeWasmBackend();
    
    await loadTransformers();
    onnxRuntimeInitialized = true;
    console.log('[TRANSCRIPTION:worker] ONNX Runtime initialized');
}

const MAX_NEW_TOKENS = 32; // Reduced from 64 for faster processing

/**
 * This class uses the Singleton pattern to ensure that only one instance of the model is loaded.
 */
class AutomaticSpeechRecognitionPipeline {
    static model_id = null;
    static tokenizer = null;
    static processor = null;
    static model = null;

    static async getInstance(progress_callback = null) {
        await loadTransformers();
        this.model_id = 'Xenova/whisper-tiny';

        try {
            console.log('[TRANSCRIPTION:worker] Loading model:', this.model_id);
            console.log('[TRANSCRIPTION:worker] Remote URL:', env.remoteURL || 'default (https://huggingface.co)');
            
            // Load tokenizer and processor in parallel
            const [tokenizer, processor] = await Promise.all([
                AutoTokenizer.from_pretrained(this.model_id, {
                    progress_callback,
                }).catch(err => {
                    console.error('[TRANSCRIPTION:worker] Tokenizer loading error:', err);
                    throw err;
                }),
                AutoProcessor.from_pretrained(this.model_id, {
                    progress_callback,
                }).catch(err => {
                    console.error('[TRANSCRIPTION:worker] Processor loading error:', err);
                    throw err;
                })
            ]);
            
            this.tokenizer = tokenizer;
            this.processor = processor;

            if (!this.model) {
                // In web worker, use WASM backend directly to avoid initialization issues
                console.log('[TRANSCRIPTION:worker] Loading model with WASM backend (worker environment)...');
                console.log('[TRANSCRIPTION:worker] Environment before model load:', {
                    device: env.device,
                    hasOrt: !!self.ort,
                    ortBackends: self.ort?.backends,
                    envBackends: env.backends,
                    ortEnv: self.ort?.env,
                });
                
                try {
                    // Wait a bit to ensure WASM backend is ready
                    // Sometimes transformers needs a moment to initialize the backend
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    this.model = await WhisperForConditionalGeneration.from_pretrained(this.model_id, {
                        dtype: {
                            encoder_model: 'fp32',
                            decoder_model_merged: 'q4',
                        },
                        device: 'wasm',
                        progress_callback,
                        // Suppress warnings
                        quiet: true
                    });
                    console.log('[TRANSCRIPTION:worker] Model loaded successfully with WASM');
                } catch (error) {
                    console.error('[TRANSCRIPTION:worker] Failed to load model with WASM:', error);
                    console.error('[TRANSCRIPTION:worker] Error details:', {
                        message: error.message,
                        stack: error.stack?.substring(0, 500),
                        hasOrt: !!self.ort,
                        ortBackends: self.ort?.backends,
                        envBackends: env.backends,
                    });
                    
                    // Try without explicit device parameter - let transformers decide
                    console.log('[TRANSCRIPTION:worker] Retrying without explicit device parameter...');
                    try {
                        this.model = await WhisperForConditionalGeneration.from_pretrained(this.model_id, {
                            dtype: {
                                encoder_model: 'fp32',
                                decoder_model_merged: 'q4',
                            },
                            progress_callback,
                            quiet: true
                        });
                        console.log('[TRANSCRIPTION:worker] Model loaded successfully (auto device)');
                    } catch (retryError) {
                        console.error('[TRANSCRIPTION:worker] Retry also failed:', retryError.message);
                        throw error; // Throw original error
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load tokenizer/processor:', error);
            throw error;
        }

        return this;
    }
}

let processing = false;
async function generate({ audio, language }) {
    if (processing) return;
    processing = true;

    console.log('Transcription worker received audio data:', audio.length, 'samples, language:', language);

    // Tell the main thread we are starting
    self.postMessage({ status: 'start' });

    // Retrieve the text-generation pipeline.
    const pipeline = await AutomaticSpeechRecognitionPipeline.getInstance();

    const inputs = await pipeline.processor(audio);

    const outputs = await pipeline.model.generate(inputs.input_features, {
        max_new_tokens: MAX_NEW_TOKENS,
        language,
        // Optimized parameters for faster processing
        num_beams: 1, // Use greedy decoding instead of beam search
        temperature: 1.0, // Lower temperature for more deterministic output
        do_sample: false, // Disable sampling for faster processing
    });

    const outputText = pipeline.tokenizer.batch_decode(outputs, { skip_special_tokens: true });
    
    console.log('Transcription result:', outputText);

    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output: outputText,
    });
    processing = false;
}

async function load() {
    try {
        self.postMessage({
            status: 'loading',
            data: 'Initializing ONNX Runtime...'
        });

        // Initialize ONNX Runtime before loading transformers models
        await initializeOnnxRuntime();

        self.postMessage({
            status: 'loading',
            data: 'Loading model...'
        });

        // Load the pipeline and save it for future use.
        await AutomaticSpeechRecognitionPipeline.getInstance(x => {
            // We also add a progress callback to the pipeline so that we can
            // track model loading.
            self.postMessage(x);
        });

        self.postMessage({ status: 'ready' });
    } catch (error) {
        console.error('[TRANSCRIPTION:worker] Error loading model:', error);
        self.postMessage({
            status: 'error',
            error: error.message || 'Failed to load model'
        });
    }
}
// Listen for messages from the main thread
self.addEventListener('message', async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'load':
            load();
            break;

        case 'generate':
            generate(data);
            break;
    }
});
