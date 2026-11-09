import type { Bonus } from "./types";
import { randomStream, shuffle } from "./random";
export const GENERATOR_VERSION = "pairs-v1";
export const QUALITY_WEIGHTS = { nearbyWords: 4, density: 1, earlyWords: 3 };
export const DEFAULT_GENERATOR = {
  candidates: 16,
  maxAttempts: 256,
  topFraction: 0.25,
  wordRadius: 2,
  densityLimit: 4,
};
export const mirror = (i: number) => 224 - i;
export const pair = (i: number) => Math.min(i, mirror(i));
export const coord = (i: number) =>
  `${String.fromCharCode(65 + (i % 15))}${Math.floor(i / 15) + 1}`;
export const distance = (a: number, b: number) =>
  Math.max(
    Math.abs(Math.floor(a / 15) - Math.floor(b / 15)),
    Math.abs((a % 15) - (b % 15)),
  );
export function quality(
  layout: readonly Bonus[],
  settings = DEFAULT_GENERATOR,
): number {
  let score = 0;
  const premiums = layout.flatMap((b, i) => (b === "NONE" ? [] : [i]));
  const words = premiums.filter(
    (i) => layout[i] === "DW" || layout[i] === "TW",
  );
  for (let a = 0; a < words.length; a++)
    for (let b = a + 1; b < words.length; b++)
      if (distance(words[a], words[b]) <= settings.wordRadius)
        score += QUALITY_WEIGHTS.nearbyWords;
  for (let r = 0; r < 13; r++)
    for (let c = 0; c < 13; c++) {
      let n = 0;
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          if (layout[(r + dr) * 15 + c + dc] !== "NONE") n++;
      score += Math.max(0, n - settings.densityLimit) * QUALITY_WEIGHTS.density;
    }
  for (const i of words)
    if (distance(i, 112) <= 3) score += QUALITY_WEIGHTS.earlyWords;
  return score;
}
export function generateLayout(
  seed: string,
  overrides: Partial<typeof DEFAULT_GENERATOR> = {},
): Bonus[] {
  const settings = { ...DEFAULT_GENERATOR, ...overrides };
  if (
    !Number.isInteger(settings.candidates) ||
    settings.candidates < 1 ||
    settings.maxAttempts < settings.candidates ||
    settings.topFraction <= 0 ||
    settings.topFraction > 1
  )
    throw Error("Invalid generator settings.");
  const random = randomStream(`${seed}:layout:${GENERATOR_VERSION}`);
  const candidates: { layout: Bonus[]; score: number }[] = [];
  for (
    let attempt = 0;
    attempt < settings.maxAttempts && candidates.length < settings.candidates;
    attempt++
  ) {
    const layout: Bonus[] = Array(225).fill("NONE");
    let tw: number[] = [];
    for (const i of shuffle(
      Array.from({ length: 112 }, (_, i) => i),
      random,
    )) {
      const cells = [i, mirror(i)];
      if (
        cells.some((c) => distance(c, 112) <= 2) ||
        distance(...(cells as [number, number])) <= 1 ||
        cells.some((c) => tw.some((t) => distance(c, t) <= 1))
      )
        continue;
      cells.forEach((c) => (layout[c] = "TW"));
      tw = tw.concat(cells);
      if (tw.length === 8) break;
    }
    if (tw.length !== 8) continue;
    const free = shuffle(
      Array.from({ length: 112 }, (_, i) => i).filter(
        (i) => layout[i] === "NONE",
      ),
      random,
    );
    let cursor = 0;
    for (const [bonus, count] of [
      ["TL", 6],
      ["DW", 8],
      ["DL", 12],
    ] as const)
      for (let n = 0; n < count; n++) {
        const i = free[cursor++];
        layout[i] = layout[mirror(i)] = bonus;
      }
    candidates.push({ layout, score: quality(layout, settings) });
  }
  if (candidates.length < settings.candidates)
    throw Error("Unable to generate a board within the attempt limit.");
  candidates.sort((a, b) => a.score - b.score);
  return candidates[
    Math.floor(
      random() *
        Math.max(1, Math.ceil(candidates.length * settings.topFraction)),
    )
  ].layout;
}
