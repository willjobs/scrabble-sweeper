import text from "../data/dictionary.txt?raw";
export { DICTIONARY_ID } from "./dictionary-meta";
export const dictionary: ReadonlySet<string> = new Set(text.trim().split("\n"));
