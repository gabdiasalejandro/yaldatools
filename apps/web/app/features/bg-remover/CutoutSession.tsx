import { useId, useState } from "react";
import { BG_SERVER_FULL } from "~/config";
import { useMessages } from "~/i18n/messages";
import { saveFile } from "~/shared/browser/download";
import { Mascot } from "~/shared/ui/Mascot";
import { canvasToPng, drawRaster } from "./browserImage";
import { CutoutCanvas, type Tool } from "./CutoutCanvas";
import { DiagnosticsPanel, type Refinement } from "./DiagnosticsPanel";
import { DOUBTFUL_THRESHOLD } from "./model";
import { compose } from "./pipeline";
import { PrivacyDialog } from "./PrivacyDialog";
import type { Raster, Rgb } from "./raster";
import type { SamPoint } from "./sam";
import { RefineFailure, nextServerModel, refineOnServer, type RefineError } from "./serverRefine";
import { useAlphaHistory } from "./useAlphaHistory";
import type { RemoverState } from "./useBackgroundRemover";
import { useSam } from "./useSam";

type Done = Extract<RemoverState, { status: "done" }>;
type BackgroundChoice = "transparent" | "white" | "color";
const TOOLS: readonly Tool[] = ["view", "erase", "restore", "select"];

function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

type CutoutSessionProps = {
  image: Raster;
  result: Done["result"];
  onAnother: () => void;
  onBytesSent: (bytes: number) => void;
};

/** Everything the user can do with one cut-out: retouch, select, refine, download. */
export function CutoutSession({ image, result, onAnother, onBytesSent }: CutoutSessionProps) {
  const t = useMessages().removeBg;
  const id = useId();
  const history = useAlphaHistory(result.alpha);
  const sam = useSam(image);
  const [tool, setTool] = useState<Tool>("view");
  const [brushSize, setBrushSize] = useState(20);
  const [choice, setChoice] = useState<BackgroundChoice>("transparent");
  const [color, setColor] = useState("#f3d6e7");
  const [points, setPoints] = useState<SamPoint[]>([]);
  const [include, setInclude] = useState(true);
  const [refinement, setRefinement] = useState<Refinement | null>(null);
  const [selected, setSelected] = useState(false);
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<RefineError | null>(null);

  const background: Rgb | null = choice === "transparent" ? null : choice === "white" ? [255, 255, 255] : hexToRgb(color);
  const nextModel = nextServerModel(refinement?.model ?? null, BG_SERVER_FULL);
  const looksHard = result.method === "model" && result.doubtful > DOUBTFUL_THRESHOLD;

  const pickTool = (next: Tool) => {
    setTool(next);
    if (next === "select") sam.prepare();
  };

  const tap = async (point: { x: number; y: number }, primary: boolean) => {
    if (sam.state.status !== "ready") return;
    const next = [...points, { ...point, include: primary ? include : !include }];
    setPoints(next);
    try {
      history.push(await sam.select(next));
      setSelected(true);
    } catch {
      // A newer tap superseded this one, or decoding failed; the mask stays as it was.
    }
  };

  const improve = async () => {
    setAsking(false);
    if (!nextModel) return;
    setSending(true);
    setServerError(null);
    try {
      const refined = await refineOnServer(image, nextModel);
      onBytesSent(refined.bytesSent);
      history.push(refined.alpha);
      setRefinement({ model: refined.model, seconds: refined.seconds });
      setSelected(false);
      setPoints([]);
    } catch (error) {
      setServerError(error instanceof RefineFailure ? error.reason : "failed");
    } finally {
      setSending(false);
    }
  };

  const download = async () => {
    const canvas = document.createElement("canvas");
    drawRaster(canvas, compose(image, history.alpha, background));
    saveFile(await canvasToPng(canvas), "sin-fondo-yaldatools.png");
  };

  const samNote =
    sam.state.status === "loadingModel"
      ? t.samLoading
      : sam.state.status === "embedding"
        ? t.samEmbedding
        : sam.state.status === "error"
          ? t.samError
          : t.selectHint;

  return (
    <>
      <div className="bg-remover-main" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <div role="toolbar" aria-label={t.tools} className="cutout-tools">
          {TOOLS.map((option) => (
            <button
              key={option}
              type="button"
              className="raised btn"
              aria-pressed={tool === option}
              onClick={() => pickTool(option)}
            >
              {t.toolNames[option]}
            </button>
          ))}
          <button type="button" className="raised btn" onClick={history.undo} disabled={!history.canUndo}>
            {t.undo}
          </button>
          <button type="button" className="raised btn" onClick={history.redo} disabled={!history.canRedo}>
            {t.redo}
          </button>
        </div>

        {(tool === "erase" || tool === "restore") && (
          <label className="cutout-option">
            {t.brushSize}
            <input
              type="range"
              min={4}
              max={80}
              value={brushSize}
              onChange={(event) => setBrushSize(Number(event.target.value))}
            />
          </label>
        )}

        {tool === "select" && (
          <div className="cutout-option" role="status" aria-live="polite">
            <span>{samNote}</span>
            {sam.state.status === "loadingModel" && (
              <progress className="progress" max={1} value={sam.state.progress} aria-label={t.samLoading} />
            )}
            {sam.state.status === "ready" && (
              <>
                <span role="group" aria-label={t.selectMode} style={{ display: "flex", gap: 2 }}>
                  <button type="button" className="raised btn" aria-pressed={include} onClick={() => setInclude(true)}>
                    {t.include}
                  </button>
                  <button type="button" className="raised btn" aria-pressed={!include} onClick={() => setInclude(false)}>
                    {t.exclude}
                  </button>
                </span>
                <button type="button" className="raised btn" onClick={() => setPoints([])} disabled={points.length === 0}>
                  {t.clearPoints}
                </button>
              </>
            )}
          </div>
        )}

        <div className={`sunken result-preview ${choice === "transparent" ? "checkerboard" : ""}`}>
          <CutoutCanvas
            image={image}
            alpha={history.alpha}
            background={background}
            tool={tool}
            brushSize={brushSize}
            points={tool === "select" ? points : []}
            label={t.previewAlt}
            onStroke={history.push}
            onTap={tap}
          />
        </div>

        <fieldset className="fieldset" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <legend>{t.background}</legend>
          {(["transparent", "white", "color"] as const).map((option) => (
            <label key={option} style={{ display: "flex", gap: 4, alignItems: "center", minHeight: 44 }}>
              <input type="radio" name={`${id}-bg`} checked={choice === option} onChange={() => setChoice(option)} />
              {t.backgrounds[option]}
            </label>
          ))}
          <input
            type="color"
            aria-label={t.pickColor}
            value={color}
            onChange={(event) => {
              setColor(event.target.value);
              setChoice("color");
            }}
            style={{ width: 44, height: 44, padding: 0, border: 0, background: "none" }}
          />
        </fieldset>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" className="raised btn btn-primary" onClick={download}>
            {t.download}
          </button>
          <button type="button" className="raised btn" onClick={onAnother}>
            {t.another}
          </button>
        </div>
      </div>

      <aside className="bg-remover-side">
        <DiagnosticsPanel result={result} refinement={refinement} selected={selected} />
        <fieldset className="fieldset" style={{ display: "flex", flexDirection: "column", gap: 8, alignSelf: "stretch" }}>
          <legend>{t.server}</legend>
          {!refinement && (
            <div className="sunken tooltip" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ margin: 0 }}>{looksHard ? t.improveSuggested : t.toolsFirst}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button type="button" className="raised btn" onClick={() => pickTool("select")}>
                  {t.toolNames.select}
                </button>
                <button type="button" className="raised btn" onClick={() => pickTool("restore")}>
                  {t.toolNames.restore}
                </button>
              </div>
            </div>
          )}
          {nextModel ? (
            <button type="button" className="raised btn" disabled={sending} onClick={() => setAsking(true)}>
              {sending ? t.improving : nextModel === "lite" ? t.improve : t.improveFull}
            </button>
          ) : (
            <p style={{ margin: 0 }}>{t.improveDone}</p>
          )}
          {serverError && (
            <p role="alert" className="sunken tooltip" style={{ margin: 0 }}>
              {t.serverErrors[serverError]}
            </p>
          )}
        </fieldset>
        <Mascot label={sending ? t.mascotWorkingAlt : t.mascotDoneAlt} size={96} motion={sending ? "busy" : "idle"} />
      </aside>

      <PrivacyDialog open={asking} onSend={improve} onKeepLocal={() => setAsking(false)} />
    </>
  );
}
