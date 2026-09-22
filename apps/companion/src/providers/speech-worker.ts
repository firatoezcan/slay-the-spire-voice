import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const runtime = require("sherpa-onnx-node");
let recognizer: any;
let directory = "";
process.on("message", async (message: { id: string; modelDir: string; audio: number[] }) => {
  try {
    if (!recognizer || directory !== message.modelDir) {
      directory = message.modelDir;
      recognizer = await runtime.OfflineRecognizer.createAsync({ modelConfig: { transducer: {
        encoder: join(directory, "encoder.int8.onnx"), decoder: join(directory, "decoder.int8.onnx"), joiner: join(directory, "joiner.int8.onnx")
      }, tokens: join(directory, "tokens.txt"), modelType: "nemo_transducer", numThreads: 2, provider: "cpu", debug: 0 }, decodingMethod: "greedy_search" });
    }
    const stream = recognizer.createStream();
    stream.acceptWaveform({ sampleRate: 16000, samples: new Float32Array(message.audio) });
    recognizer.decode(stream);
    process.send?.({ id: message.id, text: recognizer.getResult(stream).text });
  } catch (error) { process.send?.({ id: message.id, error: String(error) }); }
});
