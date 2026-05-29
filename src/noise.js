// Tiny deterministic value-noise. Good enough for gentle rolling hills and for
// scattering trees the same way every load (so the world is stable, not random
// each refresh). No dependencies.

// Hash a 2D integer cell into a pseudo-random float in [0, 1).
function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  // >>> 0 forces unsigned, then normalise.
  return ((h >>> 0) % 100000) / 100000;
}

function smooth(t) {
  // Smoothstep — removes the grid-y look of raw value noise.
  return t * t * (3 - 2 * t);
}

// Bilinearly-interpolated value noise sample at world coords (x, y).
function valueNoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const v00 = hash2(xi, yi, seed);
  const v10 = hash2(xi + 1, yi, seed);
  const v01 = hash2(xi, yi + 1, seed);
  const v11 = hash2(xi + 1, yi + 1, seed);

  const u = smooth(xf);
  const v = smooth(yf);

  const top = v00 + (v10 - v00) * u;
  const bottom = v01 + (v11 - v01) * u;
  return top + (bottom - top) * v;
}

// Layered ("fractal") noise — a few octaves of value noise stacked for a more
// natural hill shape. Returns roughly [-1, 1].
export function fractalNoise(x, y, seed = 1337) {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;
  for (let o = 0; o < 4; o++) {
    total += valueNoise(x * frequency, y * frequency, seed + o) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return (total / max) * 2 - 1;
}

// Per-point deterministic random, used to decide tree placement / variation.
export function rand2(x, y, seed = 99) {
  return hash2(Math.floor(x), Math.floor(y), seed);
}
