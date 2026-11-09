import { expect, test } from "vitest";
test("runs TypeScript tests", () => {
  expect(new Set(["A", "A", "T"]).size).toBe(2);
});
