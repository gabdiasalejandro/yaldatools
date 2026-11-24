import type { Difficulty } from "./model";
import type { Stage } from "./pipeline";
import type { TriageResult } from "./triage";

export type WorkerRequest = {
  type: "run";
  id: number;
  width: number;
  height: number;
  /** RGBA pixels, transferred to the worker. */
  pixels: ArrayBuffer;
  modelUrl: string;
};

export type WorkerResult = {
  alpha: ArrayBuffer;
  triage: TriageResult;
  method: "floodFill" | "model";
  difficulty: Difficulty;
  doubtful: number;
  processedOn: "device";
  milliseconds: number;
};

export type WorkerMessage =
  | { type: "stage"; id: number; stage: Stage; progress?: number }
  | { type: "done"; id: number; result: WorkerResult }
  | { type: "error"; id: number; reason: "modelUnavailable" | "failed" };
