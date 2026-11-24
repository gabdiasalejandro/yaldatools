import ratUrl from "~/assets/mascot/rat.svg";

/** The rat is drawn on a 32×32 grid; whole multiples keep every pixel crisp. */
const GRID = 32;

type MascotProps = {
  /** Alternative text: what the mascot is doing here. */
  label: string;
  /** Desired size in px; rounded to the nearest multiple of 32. */
  size: number;
  /** "busy" wiggles while something is being processed. */
  motion?: "idle" | "busy";
};

export function Mascot({ label, size, motion = "idle" }: MascotProps) {
  const pixels = Math.max(GRID, Math.round(size / GRID) * GRID);
  return (
    <img
      src={ratUrl}
      alt={label}
      width={pixels}
      height={pixels}
      className={`mascot mascot--${motion}`}
      draggable={false}
    />
  );
}
