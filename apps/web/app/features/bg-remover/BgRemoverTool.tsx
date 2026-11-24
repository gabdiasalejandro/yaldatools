import { format, useMessages } from "~/i18n/messages";
import { MascotSlot } from "~/shared/ui/MascotSlot";
import { Window } from "~/shared/ui/Window";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { DropZone } from "./DropZone";
import { ResultView } from "./ResultView";
import { useBackgroundRemover } from "./useBackgroundRemover";

export function BgRemoverTool() {
  const t = useMessages().removeBg;
  const { state, process, reset } = useBackgroundRemover();

  const status = [t.statusLocal];
  if (state.status === "done") status.push(format(t.statusSize, { width: state.image.width, height: state.image.height }));

  return (
    <Window title={t.windowTitle} style={{ width: "100%", maxWidth: 1080 }} status={status}>
      <div className="bg-remover">
        <div className="bg-remover-main">
          {state.status === "idle" && <DropZone onFile={process} />}

          {state.status === "working" && (
            <div className="sunken dropzone" role="status" aria-live="polite">
              <MascotSlot label={t.mascotWorkingAlt} size={110} />
              <p style={{ margin: 0 }}>{t.stages[state.stage]}</p>
              <progress
                className="progress"
                max={1}
                value={state.stage === "loadingModel" ? state.progress : undefined}
                aria-label={t.stages[state.stage]}
              />
            </div>
          )}

          {state.status === "error" && (
            <div className="sunken dropzone" role="alert">
              <p style={{ margin: 0 }}>{t.errors[state.reason]}</p>
              <button type="button" className="raised btn btn-primary" onClick={reset}>
                {t.tryAgain}
              </button>
            </div>
          )}

          {state.status === "done" && <ResultView image={state.image} alpha={state.result.alpha} onAnother={reset} />}
        </div>

        <aside className="bg-remover-side">
          {state.status === "done" ? (
            <>
              <DiagnosticsPanel result={state.result} />
              <MascotSlot label={t.mascotDoneAlt} size={96} />
            </>
          ) : (
            <div className="sunken tooltip">{t.tip}</div>
          )}
        </aside>
      </div>
    </Window>
  );
}
