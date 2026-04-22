export const PORT = Number(process.env.PORT ?? 4000);

// How long a key stays "current". Short for a live demo so rotations are visible.
export const KEY_TIMESPAN_MS = Number(process.env.KEY_TIMESPAN_MS ?? 60_000);
