// Small helpers for reading and writing binary containers.

export function u16be(bytes: Uint8Array, at: number): number {
  return (bytes[at] << 8) | bytes[at + 1];
}

export function u32be(bytes: Uint8Array, at: number): number {
  return ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
}

export function u16le(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8);
}

export function u32le(bytes: Uint8Array, at: number): number {
  return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
}

export function writeU32be(target: Uint8Array, at: number, value: number): void {
  target[at] = (value >>> 24) & 0xff;
  target[at + 1] = (value >>> 16) & 0xff;
  target[at + 2] = (value >>> 8) & 0xff;
  target[at + 3] = value & 0xff;
}

export function writeU32le(target: Uint8Array, at: number, value: number): void {
  target[at] = value & 0xff;
  target[at + 1] = (value >>> 8) & 0xff;
  target[at + 2] = (value >>> 16) & 0xff;
  target[at + 3] = (value >>> 24) & 0xff;
}

export function ascii(bytes: Uint8Array, at: number, length: number): string {
  let text = "";
  for (let i = at; i < at + length && i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
  return text;
}

export function fromAscii(text: string): Uint8Array {
  return Uint8Array.from(text, (char) => char.charCodeAt(0));
}

export function startsWith(bytes: Uint8Array, at: number, prefix: string): boolean {
  return ascii(bytes, at, prefix.length) === prefix;
}

export function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Thrown when a file does not follow its container format. */
export class MalformedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedFileError";
  }
}
