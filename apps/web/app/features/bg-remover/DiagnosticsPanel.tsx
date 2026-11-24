import { format, useMessages } from "~/i18n/messages";
import type { ServerModelName } from "./serverRefine";
import type { WorkerResult } from "./worker-protocol";

const percent = (value: number) => `${Math.round(value * 100)} %`;

export type Refinement = { model: ServerModelName; seconds: number };

type DiagnosticsPanelProps = {
  result: Omit<WorkerResult, "alpha">;
  /** Set once the server has refined the cut-out. */
  refinement: Refinement | null;
  /** True when the current mask comes from tap-to-select. */
  selected: boolean;
};

/** Shows how the image was judged and processed: part of the product's charm. */
export function DiagnosticsPanel({ result, refinement, selected }: DiagnosticsPanelProps) {
  const t = useMessages().removeBg;
  const method = refinement ? t.serverModels[refinement.model] : selected ? t.methods.select : t.methods[result.method];
  const seconds = refinement ? refinement.seconds : result.milliseconds / 1000;
  const rows: [string, string][] = [
    [t.difficulty, t.difficulties[result.difficulty]],
    [t.method, method],
    [t.processedOn, refinement ? t.serverPlace : t.device],
    [t.borderUniformity, percent(result.triage.borderUniformity)],
    [t.contrast, percent(result.triage.contrast)],
    [t.edgeDensity, percent(result.triage.edgeDensity)],
    ...(result.method === "model" ? [[t.doubtful, percent(result.doubtful)] as [string, string]] : []),
    [t.time, format(t.timeValue, { seconds: seconds.toFixed(1) })],
  ];

  return (
    <fieldset className="fieldset" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <legend>{t.diagnostics}</legend>
      <dl className="diagnostics">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </fieldset>
  );
}
