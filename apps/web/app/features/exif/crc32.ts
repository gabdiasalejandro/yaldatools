// CRC-32 (ISO 3309), the checksum every PNG chunk carries.

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(parts: readonly Uint8Array[]): number {
  let crc = 0xffffffff;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) crc = TABLE[(crc ^ part[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
