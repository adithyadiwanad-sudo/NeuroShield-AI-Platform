// Browser-side signal descriptors. These are not a deepfake classifier.
function powerSpectrum(samples, offset, size) {
  const real = new Float64Array(size),
    imag = new Float64Array(size);
  for (let i = 0; i < size; i++)
    real[i] =
      (samples[offset + i] || 0) *
      (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1)));
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [real[i], real[j]] = [real[j], real[i]];
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    for (let i = 0; i < size; i += length)
      for (let j = 0; j < length / 2; j++) {
        const cos = Math.cos(angle * j),
          sin = Math.sin(angle * j),
          a = i + j,
          b = a + length / 2;
        const tr = real[b] * cos - imag[b] * sin,
          ti = real[b] * sin + imag[b] * cos;
        real[b] = real[a] - tr;
        imag[b] = imag[a] - ti;
        real[a] += tr;
        imag[a] += ti;
      }
  }
  return Float64Array.from(
    real.slice(0, size / 2 + 1),
    (v, i) => (v * v + imag[i] * imag[i]) / size,
  );
}
export function analyzeAudio(samples, sampleRate) {
  if (!samples.length || sampleRate <= 0)
    throw new Error("Audio contains no samples.");
  const size = 1024,
    filters = 26,
    count = Math.min(100, Math.max(1, Math.floor(samples.length / size)));
  const melMax = 2595 * Math.log10(1 + sampleRate / 2 / 700);
  const bins = Array.from({ length: filters + 2 }, (_, i) =>
    Math.min(
      size / 2,
      Math.floor(
        ((size + 1) * 700 * (10 ** ((melMax * i) / (filters + 1) / 2595) - 1)) /
          sampleRate,
      ),
    ),
  );
  const mfcc = new Array(13).fill(0);
  let centroid = 0,
    valid = 0,
    rms = 0;
  for (let f = 0; f < count; f++) {
    const offset = Math.floor(
      (f * Math.max(0, samples.length - size)) / Math.max(1, count - 1),
    );
    const power = powerSpectrum(samples, offset, size);
    let sum = 0,
      weighted = 0;
    for (let k = 0; k < power.length; k++) {
      const magnitude = Math.sqrt(power[k]);
      sum += magnitude;
      weighted += (magnitude * k * sampleRate) / size;
    }
    if (sum > 1e-9) {
      centroid += weighted / sum;
      valid++;
    }
    const logs = Array.from({ length: filters }, (_, m) => {
      let energy = 0;
      const [left, center, right] = bins.slice(m, m + 3);
      for (let k = left; k < center; k++)
        energy += (power[k] * (k - left)) / Math.max(1, center - left);
      for (let k = center; k < right; k++)
        energy += (power[k] * (right - k)) / Math.max(1, right - center);
      return Math.log(Math.max(energy, 1e-12));
    });
    for (let c = 0; c < 13; c++)
      for (let m = 0; m < filters; m++)
        mfcc[c] +=
          (logs[m] * Math.cos((Math.PI * c * (m + 0.5)) / filters)) / count;
  }
  for (let i = 0; i < samples.length; i++) rms += samples[i] * samples[i];
  return {
    centroid: valid ? centroid / valid : 0,
    mfcc,
    rms: Math.sqrt(rms / samples.length),
    frames: count,
    duration: samples.length / sampleRate,
  };
}
