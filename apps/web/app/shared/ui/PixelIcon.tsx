// Original 16×16 pixel-art icons, drawn as SVG and scaled with crisp edges.

export type IconKind = "bg" | "qr" | "img" | "pdf" | "lock" | "exif" | "note" | "heart" | "start";

const ICONS: Record<IconKind, React.ReactNode> = {
  bg: (
    <>
      <path d="M5 9h2v1h-2zM6 8h2v1h-2zM7 7h2v1h-2zM8 6h2v1h-2zM9 5h2v1h-2zM10 4h2v1h-2zM11 3h2v1h-2zM12 2h2v1h-2z" fill="#e8e8e8" />
      <path d="M9 9h2v1h-2zM8 8h2v1h-2zM6 6h2v1h-2zM5 5h2v1h-2zM4 4h2v1h-2zM3 3h2v1h-2zM2 2h2v1h-2z" fill="#c0c0c0" />
      <path d="M1 11h1v2h-1zM5 11h1v2h-1zM2 10h3v1h-3zM2 13h3v1h-3zM10 11h1v2h-1zM14 11h1v2h-1zM11 10h3v1h-3zM11 13h3v1h-3z" fill="#e05fa8" />
    </>
  ),
  qr: (
    <>
      <rect x="1" y="1" width="14" height="14" fill="#ffffff" />
      <path d="M2 2h5v5h-5zM9 2h5v5h-5zM2 9h5v5h-5zM10 10h1v1h-1zM12 10h2v1h-2zM9 12h2v1h-2zM12 12h1v2h-1zM10 13h1v1h-1z" fill="#000080" />
      <path d="M3 3h3v3h-3zM10 3h3v3h-3zM3 10h3v3h-3z" fill="#ffffff" />
      <path d="M4 4h1v1h-1zM11 4h1v1h-1zM4 11h1v1h-1z" fill="#000080" />
    </>
  ),
  img: (
    <>
      <rect x="1" y="3" width="14" height="10" fill="#000080" />
      <rect x="2" y="4" width="12" height="8" fill="#7ec8f0" />
      <rect x="11" y="5" width="2" height="2" fill="#ffd23f" />
      <path d="M2 9h4v-1h2v-1h2v1h2v1h2v3h-12z" fill="#2f7d32" />
    </>
  ),
  pdf: (
    <>
      <path d="M3 1h8l3 3v11h-11z" fill="#ffffff" />
      <path d="M11 1v3h3z" fill="#a0a0a0" />
      <rect x="3" y="7" width="11" height="4" fill="#c0272d" />
      <path d="M5 12h7v1h-7zM5 3h4v1h-4zM5 5h6v1h-6z" fill="#808080" />
    </>
  ),
  lock: (
    <>
      <path d="M5 2h6v1h-6zM4 3h1v4h-1zM11 3h1v4h-1z" fill="#d0d0d0" />
      <rect x="3" y="7" width="10" height="8" fill="#e0b020" />
      <rect x="3" y="7" width="10" height="1" fill="#ffe27a" />
      <rect x="7" y="9" width="2" height="4" fill="#3a2a00" />
    </>
  ),
  exif: (
    <>
      <rect x="5" y="3" width="5" height="2" fill="#505050" />
      <rect x="1" y="5" width="14" height="9" fill="#505050" />
      <rect x="5" y="7" width="6" height="5" fill="#d0d0d0" />
      <rect x="7" y="8" width="2" height="3" fill="#000080" />
      <line x1="1" y1="15" x2="15" y2="1" stroke="#ff3b3b" strokeWidth="2" />
    </>
  ),
  note: (
    <>
      <rect x="3" y="2" width="10" height="13" fill="#ffffff" />
      <rect x="3" y="1" width="10" height="2" fill="#000080" />
      <path d="M5 6h6v1h-6zM5 8h6v1h-6zM5 10h6v1h-6zM5 12h4v1h-4z" fill="#7ea0d0" />
    </>
  ),
  heart: (
    <>
      <path d="M3 3h3v1h-3zM10 3h3v1h-3zM2 4h5v1h-5zM9 4h5v1h-5zM2 5h12v3h-12zM3 8h10v1h-10zM4 9h8v1h-8zM5 10h6v1h-6zM6 11h4v1h-4zM7 12h2v1h-2z" fill="#e05fa8" />
      <rect x="4" y="5" width="1" height="1" fill="#ffffff" />
    </>
  ),
  start: (
    <>
      <rect x="6" y="1" width="4" height="14" fill="#b0307a" />
      <rect x="1" y="6" width="14" height="4" fill="#b0307a" />
      <rect x="4" y="4" width="8" height="8" fill="#000080" />
    </>
  ),
};

export function PixelIcon({ kind, size = 48 }: { kind: IconKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {ICONS[kind]}
    </svg>
  );
}
