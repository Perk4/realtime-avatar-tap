export const SAMPLE_RATE_HZ = 16_000;
export const BLOCK_MS = 40;
export const WINDOW_SAMPLES = (SAMPLE_RATE_HZ * BLOCK_MS) / 1000;

export function floatToInt16(sample) {
  const clipped = Math.max(-1, Math.min(1, sample));
  return clipped < 0 ? Math.round(clipped * 32768) : Math.round(clipped * 32767);
}

export function downsampleTo16k(float32, fromRate) {
  if (fromRate === SAMPLE_RATE_HZ) {
    return float32;
  }
  if (fromRate <= 0) {
    throw new Error("fromRate");
  }
  const ratio = fromRate / SAMPLE_RATE_HZ;
  const length = Math.floor(float32.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const src = Math.min(float32.length - 1, Math.floor(i * ratio));
    out[i] = float32[src] ?? 0;
  }
  return out;
}

export function floatsToPcm16(float32) {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    pcm[i] = floatToInt16(float32[i] ?? 0);
  }
  return pcm;
}

export function mixToMono(buffer) {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  if (channels === 1) {
    return buffer.getChannelData(0);
  }
  const mixed = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      mixed[i] += (data[i] ?? 0) / channels;
    }
  }
  return mixed;
}
