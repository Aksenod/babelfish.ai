// Shim for onnxruntime-web to make it work in Vite worker context.
// The UMD build of onnxruntime-web expects `self.ort` (from onnxruntime-common UMD).
// We re-export from self.ort which should be populated by onnxruntime-common and onnxruntime-web
const ort = self.ort ?? {};

export const InferenceSession = ort.InferenceSession;
export const Tensor = ort.Tensor;
export const env = ort.env;
export const registerBackend = ort.registerBackend;

export default ort;
