const PCM_FORMAT = 1;
const HEADER_BYTES = 44;

export function encodePcm16Wav(pcm, sampleRate) {
  if (!(pcm instanceof Int16Array)) {
    throw new Error("pcm");
  }
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new Error("sampleRate");
  }
  const dataBytes = pcm.byteLength;
  const buffer = new ArrayBuffer(HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);
  new Int16Array(buffer, HEADER_BYTES).set(pcm);
  return new Uint8Array(buffer);
}

export function decodePcm16Wav(bytes) {
  const buffer = toArrayBuffer(bytes);
  if (buffer.byteLength < HEADER_BYTES) {
    throw new Error("wav too short");
  }
  const view = new DataView(buffer);
  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    throw new Error("not WAVE");
  }
  let offset = 12;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let channels = 0;
  let dataOffset = -1;
  let dataBytes = 0;
  while (offset + 8 <= buffer.byteLength) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (id === "fmt ") {
      const format = view.getUint16(start, true);
      channels = view.getUint16(start + 2, true);
      sampleRate = view.getUint32(start + 4, true);
      bitsPerSample = view.getUint16(start + 14, true);
      if (format !== PCM_FORMAT || channels !== 1 || bitsPerSample !== 16) {
        throw new Error("need 16-bit mono PCM");
      }
    } else if (id === "data") {
      dataOffset = start;
      dataBytes = Math.min(size, buffer.byteLength - start);
      break;
    }
    offset = start + size + (size % 2);
  }
  if (dataOffset < 0 || sampleRate <= 0) {
    throw new Error("missing fmt or data");
  }
  const sampleCount = Math.floor(dataBytes / 2);
  const pcm = new Int16Array(buffer, dataOffset, sampleCount);
  return { pcm: new Int16Array(pcm), sampleRate };
}

function toArrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) {
    return bytes;
  }
  if (ArrayBuffer.isView(bytes)) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  return Uint8Array.from(bytes).buffer;
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function readAscii(view, offset, length) {
  let text = "";
  for (let i = 0; i < length; i++) {
    text += String.fromCharCode(view.getUint8(offset + i));
  }
  return text;
}
