// Pixel-art rat mascot on a 32×32 grid, exported as a crisp SVG.
// Usage: node design/mascot/generate-rat.mjs apps/web/app/assets/mascot/rat.svg
import fs from "node:fs";
const N = 32;
const C = { K: "#1b1430", G: "#a9a3bd", D: "#7d7696", L: "#e4e0ee", P: "#f29ac4", S: "#a4307f", W: "#ffffff", N: "#000080" };
const grid = Array.from({ length: N }, () => Array(N).fill("."));
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) grid[y][x] = c; };
const ellipse = (cx, cy, rx, ry, c) => {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
    if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(x, y, c);
};
// Tail: a curl to the right, drawn first so the body covers its root.
for (const [x, y] of [[22,25],[23,25],[24,25],[25,24],[26,23],[27,22],[27,21],[27,20],[26,19],[25,19],[24,20],[24,21]]) { set(x, y, "P"); set(x, y + 1, "P"); }
// Ears behind the head.
ellipse(8, 7, 4.6, 4.6, "G"); ellipse(24, 7, 4.6, 4.6, "G");
ellipse(8, 7, 2.8, 2.8, "P"); ellipse(24, 7, 2.8, 2.8, "P");
// Body, belly, head, muzzle.
ellipse(16, 23, 7.2, 6.2, "G");
ellipse(16, 24, 4.2, 4.4, "L");
ellipse(16, 12.5, 8.4, 6.6, "G");
ellipse(16, 15.2, 3.8, 2.2, "L");
// Shading on the right side of the head and body.
for (let y = 0; y < N; y++) for (let x = 20; x < N; x++) if (grid[y][x] === "G" && (grid[y][x + 1] === "." || grid[y][x + 2] === ".")) set(x, y, "D");
// Scarf (sakura) with a hanging end.
for (let x = 9; x <= 22; x++) { if (grid[18][x] !== ".") set(x, 18, "S"); if (grid[19][x] !== ".") set(x, 19, "S"); }
set(19, 20, "S"); set(20, 20, "S"); set(19, 21, "S"); set(20, 21, "S"); set(20, 22, "S");
// Hands holding the scarf and feet.
set(12, 21, "P"); set(13, 21, "P"); set(18, 21, "P");
ellipse(12, 29, 2.6, 1.3, "P"); ellipse(20, 29, 2.6, 1.3, "P");
// Outline: every empty pixel touching the figure.
const filled = (x, y) => x >= 0 && y >= 0 && x < N && y < N && grid[y][x] !== "." && grid[y][x] !== "K";
const outline = [];
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
  if (grid[y][x] === "." && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) outline.push([x, y]);
for (const [x, y] of outline) set(x, y, "K");
// Face: eyes with shine, nose, mouth, blush, whiskers.
for (const ex of [12, 19]) { set(ex, 12, "K"); set(ex + 1, 12, "K"); set(ex, 13, "K"); set(ex + 1, 13, "K"); set(ex, 12, "W"); }
set(15, 14, "P"); set(16, 14, "P");
set(15, 16, "K"); set(16, 16, "K");
set(10, 14, "P"); set(22, 14, "P");
for (const [x, y] of [[4,14],[5,14],[6,14],[4,16],[5,16],[6,15],[25,14],[26,14],[27,14],[25,15],[26,16],[27,16]]) set(x, y, "K");
let rects = "";
for (let y = 0; y < N; y++) {
  let x = 0;
  while (x < N) {
    const c = grid[y][x];
    let w = 1;
    while (x + w < N && grid[y][x + w] === c) w++;
    if (c !== ".") rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${C[c]}"/>`;
    x += w;
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="256" height="256" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>\n`;
fs.writeFileSync(process.argv[2], svg);
console.log(grid.map((r) => r.join("")).join("\n"));
