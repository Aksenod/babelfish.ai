
import {
    AutoTokenizer,
    AutoProcessor,
    WhisperForConditionalGeneration,
} from '@xenova/transformers';


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
        this.model_id = 'Xenova/whisper-tiny';

        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
            progress_callback,
        });
        this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
            progress_callback,
        });

        if (!this.model) {
            try {
                console.log('Attempting to load model with WebGPU...');
                this.model = await WhisperForConditionalGeneration.from_pretrained(this.model_id, {
                    dtype: {
                        encoder_model: 'fp32', // 'fp16' works too
                        decoder_model_merged: 'q4', // or 'fp32' ('fp16' is broken)
                    },
                    device: 'webgpu',
                    progress_callback,
                });
                console.log('Model loaded successfully with WebGPU');
            } catch (error) {
                console.warn('WebGPU failed, falling back to WASM:', error);
                this.model = await WhisperForConditionalGeneration.from_pretrained(this.model_id, {
                    dtype: {
                        encoder_model: 'fp32',
                        decoder_model_merged: 'q4',
                    },
                    device: 'wasm',
                    progress_callback,
                });
                console.log('Model loaded successfully with WASM fallback');
            }
        }

        return Promise.all([this.tokenizer, this.processor, this.model]);
    }
}

let processing = false;
async function generate({ audio, language }) {
    if (processing) return;
    processing = true;

    // Tell the main thread we are starting
    self.postMessage({ status: 'start' });

    // Retrieve the text-generation pipeline.
    const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance();

    const inputs = await processor(audio);

    const outputs = await model.generate(inputs.input_features, {
        max_new_tokens: MAX_NEW_TOKENS,
        language,
        // Optimized parameters for faster processing
        num_beams: 1, // Use greedy decoding instead of beam search
        temperature: 1.0, // Lower temperature for more deterministic output
        do_sample: false, // Disable sampling for faster processing
    });

    const outputText = tokenizer.batch_decode(outputs, { skip_special_tokens: true });

    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output: outputText,
    });
    processing = false;
}

async function load() {
    self.postMessage({
        status: 'loading',
        data: 'Loading model...'
    });

    // Load the pipeline and save it for future use.
    const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(x => {
        // We also add a progress callback to the pipeline so that we can
        // track model loading.
        self.postMessage(x);
    });

    self.postMessage({ status: 'ready' });
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
