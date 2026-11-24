import { useEffect, useState } from "react";

function now(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Rendered only in the browser: pre-rendered HTML must not freeze the build time. */
export function Clock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    setTime(now());
    const id = window.setInterval(() => setTime(now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <time className="clock" aria-live="off">
      {time ?? " "}
    </time>
  );
}
