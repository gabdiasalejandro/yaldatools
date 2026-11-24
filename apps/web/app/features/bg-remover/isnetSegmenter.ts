// ONNX Runtime adapter for the Segmenter port. Runs only in the browser (worker).
import { MODEL_SIDE } from "./model";
import { createSession, fetchModel, ort } from "./onnxRuntime";
import type { Segmenter } from "./pipeline";

export async function createIsnetSegmenter(
  modelUrl: string,
  onProgress: (fraction: number) => void,
): Promise<Segmenter> {
  const session = await createSession(await fetchModel(modelUrl, onProgress));
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];

  return {
    async segment(input) {
      const tensor = new ort.Tensor("float32", input, [1, 3, MODEL_SIDE, MODEL_SIDE]);
      const results = await session.run({ [inputName]: tensor }, [outputName]);
      return results[outputName].data as Float32Array;
    },
  };
}
