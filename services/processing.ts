
/**
 * Savitzky–Golay smoothing coefficients for window_length = 11, polynomial_order = 2.
 * These coefficients are used for the central point of a convolution.
 */
const SG_COEFFS_W11_P2 = [
  -0.0839, 0.0210, 0.1026, 0.1608, 0.1958, 0.2075, 0.1958, 0.1608, 0.1026, 0.0210, -0.0839
];

/**
 * Applies Savitzky–Golay smoothing to a numeric array.
 */
export const applySavitzkyGolay = (data: number[]): number[] => {
  const n = data.length;
  const windowSize = 11;
  const halfWindow = 5;
  const smoothed = [...data];

  if (n < windowSize) return smoothed;

  for (let i = halfWindow; i < n - halfWindow; i++) {
    let sum = 0;
    for (let j = -halfWindow; j <= halfWindow; j++) {
      sum += data[i + j] * SG_COEFFS_W11_P2[j + halfWindow];
    }
    smoothed[i] = Number(sum.toFixed(4));
  }

  // Handle edges by keeping original or simple moving average (simplified)
  return smoothed;
};

/**
 * Normalizes data between 0 and 1.
 */
export const normalize = (data: number[]): { normalized: number[]; min: number; max: number } => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  if (range === 0) return { normalized: data.map(() => 0.5), min, max };
  
  const normalized = data.map(v => (v - min) / range);
  return { normalized, min, max };
};

/**
 * Denormalizes data.
 */
export const denormalize = (value: number, min: number, max: number): number => {
  return value * (max - min) + min;
};
