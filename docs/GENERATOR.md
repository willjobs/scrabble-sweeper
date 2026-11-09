# Generator v1

`pairs-v1` enumerates 112 noncentral symmetric pairs. It uses integer Mulberry32-style arithmetic seeded by an FNV-1a string hash. Layout and bag streams are independently named (`seed:layout:pairs-v1`, `seed:bag:v1`). Exchanges persist the advancing bag PRNG state. Reveal mode affects neither stream. Seeds come from `crypto.randomUUID()` in normal play.

For each of 16 candidates, greedily select four TW pairs from a shuffled ordering while enforcing the central 5×5 exclusion and every horizontal/vertical/diagonal separation, including the paired TW. Then assign six TL, eight DW and twelve DL pairs from shuffled remaining pairs. Failed candidates retry with a bounded 256-attempt ceiling. Invalid configuration or insufficient candidates throws; hard constraints never relax.

Quality is an integer penalty: nearby word premiums within radius 2 cost 4 each, occupancy above four bonuses per 3×3 window costs 1 per excess, and word premiums within three squares of center cost 3 each. Choose uniformly from the best quarter, not always the single best layout. These are provisional configurable heuristics, not empirically optimized play balance. `DEFAULT_GENERATOR` and `QUALITY_WEIGHTS` name all settings.

The full resulting layout, generator/rules versions and dictionary ID are saved, so restoration never regenerates a board. Generation occurs once at setup. Tests validate 1,000 seeds, deterministic equality, variability and independence from bag RNG. `npm run boards:inspect -- 20` emits layouts and descriptive statistics. `docs/boards-sample.txt` records a 20-board review sample; timings reflect this Linux executor, not a physical phone.
