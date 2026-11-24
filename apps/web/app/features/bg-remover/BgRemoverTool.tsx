import { useState } from "react";
import { format, useMessages } from "~/i18n/messages";
import { Mascot } from "~/shared/ui/Mascot";
import { Window } from "~/shared/ui/Window";
import { CutoutSession } from "./CutoutSession";
import { DropZone } from "./DropZone";
import { useBackgroundRemover } from "./useBackgroundRemover";

export function BgRemoverTool() {
  const t = useMessages().removeBg;
  const { state, process, reset } = useBackgroundRemover();
  // Bytes really sent to the server for the current image: the status bar never lies.
  const [bytesSent, setBytesSent] = useState(0);

  const start = (file: File) => {
    setBytesSent(0);
    process(file);
  };
  const another = () => {
    setBytesSent(0);
    reset();
  };

  const status = [
    bytesSent > 0 ? format(t.statusSent, { kb: Math.max(1, Math.round(bytesSent / 1024)) }) : t.statusLocal,
  ];
  if (state.status === "done") status.push(format(t.statusSize, { width: state.image.width, height: state.image.height }));

  return (
    <Window title={t.windowTitle} style={{ width: "100%", maxWidth: 1080 }} status={status}>
      <div className="bg-remover">
        {state.status === "done" ? (
          <CutoutSession
            image={state.image}
            result={state.result}
            onAnother={another}
            onBytesSent={(bytes) => setBytesSent((previous) => previous + bytes)}
          />
        ) : (
          <>
            <div className="bg-remover-main">
              {state.status === "idle" && <DropZone onFile={start} />}

              {state.status === "working" && (
                <div className="sunken dropzone" role="status" aria-live="polite">
                  <Mascot label={t.mascotWorkingAlt} size={110} motion="busy" />
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
                  <button type="button" className="raised btn btn-primary" onClick={another}>
                    {t.tryAgain}
                  </button>
                </div>
              )}
            </div>
            <aside className="bg-remover-side">
              <div className="sunken tooltip">{t.tip}</div>
            </aside>
          </>
        )}
      </div>
    </Window>
  );
}
