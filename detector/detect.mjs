// See contract.md. Pure deterministic detector; do not call a model.
// The band is computed here, from numbers only, before any response is chosen.

function isValidLatency(value) {
  // Rejects null, undefined, strings, booleans, NaN, +/-Infinity and negatives.
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function insufficient() {
  return { band: "insufficient", mean: null, stddev: null, z: null };
}

export function detect(history, current, policy) {
  const minSamples = policy && policy.minSamples;
  const thresholds = policy && policy.thresholds;

  if (!Array.isArray(history)) return insufficient();
  if (typeof minSamples !== "number" || !Number.isFinite(minSamples)) return insufficient();
  if (!Array.isArray(thresholds) || thresholds.length === 0) return insufficient();
  if (history.length < minSamples || history.length === 0) return insufficient();
  if (!isValidLatency(current)) return insufficient();
  for (let i = 0; i < history.length; i++) {
    if (!isValidLatency(history[i])) return insufficient();
  }

  // Population mean and standard deviation (divide by N). Arguments are only read.
  const n = history.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += history[i];
  const mean = sum / n;

  let squared = 0;
  for (let i = 0; i < n; i++) {
    const d = history[i] - mean;
    squared += d * d;
  }
  const stddev = Math.sqrt(squared / n);

  // Zero variance: no spread to measure against.
  if (stddev === 0) {
    if (current <= mean) return { band: 0, mean, stddev: 0, z: 0 };
    return { band: 3, mean, stddev: 0, z: null }; // unbounded positive deviation
  }

  const z = (current - mean) / stddev;

  // Band = number of thresholds reached; equality belongs to the higher band.
  // Negative z reaches no threshold, so it is band 0.
  let band = 0;
  for (let i = 0; i < thresholds.length && i < 3; i++) {
    if (z >= thresholds[i]) band = i + 1;
  }

  return { band, mean, stddev, z };
}
