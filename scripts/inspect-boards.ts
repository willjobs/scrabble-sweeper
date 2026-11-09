import { generateLayout, quality, distance } from "../src/engine/generator";
const count = Number(process.argv[2] ?? 20);
const start = performance.now();
let sum = 0;
const regions = Array(9).fill(0);
let nearCenter = 0;
let closeWords = 0;
for (let i = 0; i < count; i++) {
  const board = generateLayout(`review-${i}`);
  const score = quality(board);
  sum += score;
  const words = board.flatMap((b, p) => (b === "DW" || b === "TW" ? [p] : []));
  words.forEach((p, a) => {
    if (distance(p, 112) <= 3) nearCenter++;
    for (const q of words.slice(a + 1)) if (distance(p, q) <= 2) closeWords++;
  });
  board.forEach((b, p) => {
    if (b !== "NONE")
      regions[Math.floor(p / 15 / 5) * 3 + Math.floor((p % 15) / 5)]++;
  });
  console.log(`\nSeed review-${i}; quality penalty ${score}`);
  for (let r = 0; r < 15; r++)
    console.log(
      board
        .slice(r * 15, r * 15 + 15)
        .map((b) => (b === "NONE" ? " ." : b))
        .join(" "),
    );
}
console.log(
  `\n${count} boards; mean penalty ${(sum / count).toFixed(2)}; ${(performance.now() - start).toFixed(0)} ms`,
);
console.log(
  "Mean bonus count by 5x5 region:",
  regions.map((n) => (n / count).toFixed(2)).join(", "),
);
console.log(
  `Mean word premiums within 3 of center: ${(nearCenter / count).toFixed(2)}; mean word-premium pairs within 2: ${(closeWords / count).toFixed(2)}`,
);
