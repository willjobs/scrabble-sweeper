import text from "../data/dictionary.txt?raw";
export { DICTIONARY_ID } from "./dictionary-meta";

// Build in short batches so warming the large list does not freeze early taps.
async function buildDictionary(): Promise<ReadonlySet<string>> {
  const words = new Set<string>();
  let start = 0;
  let count = 0;
  while (start < text.length) {
    const newline = text.indexOf("\n", start);
    const end = newline < 0 ? text.length : newline;
    if (end > start) words.add(text.slice(start, end));
    start = end + 1;
    if (++count % 4096 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  return words;
}
export const dictionary = await buildDictionary();
