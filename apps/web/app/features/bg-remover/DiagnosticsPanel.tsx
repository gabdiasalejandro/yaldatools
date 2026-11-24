import { format, useMessages } from "~/i18n/messages";
import type { WorkerResult } from "./worker-protocol";

const percent = (value: number) => `${Math.round(value * 100)} %`;

/** Shows how the image was judged and processed: part of the product's charm. */
export function DiagnosticsPanel({ result }: { result: Omit<WorkerResult, "alpha"> }) {
  const t = useMessages().removeBg;
  const rows: [string, string][] = [
    [t.difficulty, t.difficulties[result.difficulty]],
    [t.method, t.methods[result.method]],
    [t.processedOn, t.device],
    [t.borderUniformity, percent(result.triage.borderUniformity)],
    [t.contrast, percent(result.triage.contrast)],
    [t.edgeDensity, percent(result.triage.edgeDensity)],
    ...(result.method === "model" ? [[t.doubtful, percent(result.doubtful)] as [string, string]] : []),
    [t.time, format(t.timeValue, { seconds: (result.milliseconds / 1000).toFixed(1) })],
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
      {result.difficulty === "hard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p className="sunken tooltip" style={{ margin: 0 }}>
            {t.refineSoon}
          </p>
          <button type="button" className="raised btn" disabled style={{ alignSelf: "flex-start" }}>
            {t.refine}
          </button>
        </div>
      )}
    </fieldset>
  );
}
