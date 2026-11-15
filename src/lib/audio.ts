/** The rate a voice message is sent at: enough for speech, its tone and its questions. */
export const voiceRate = 16000;

/** The longest a voice message may run, in seconds. */
export const voiceMaxSeconds = 90;

/** The rate a recorded call is sent at: a phone line's own, so a long call stays small. */
export const callRate = 8000;

/** The longest part of a recorded call that is sent, in seconds; the rest is left out. */
export const callMaxSeconds = 12 * 60;

/** Whether a chosen file is a recording (a call) rather than a picture, by its type or name. */
export function isSoundFile(file: { readonly type: string; readonly name: string }): boolean {
  return (
    file.type.startsWith('audio/') ||
    /\.(m4a|mp3|ogg|oga|opus|wav|aac|amr|3gp|flac)$/i.test(file.name)
  );
}

/** A running time as "0:07" or "1:23". */
export function formatElapsed(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`;
}

/** Mono samples (-1 to 1) as a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, rate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, word: string): void => {
    for (let index = 0; index < word.length; index += 1) {
      view.setUint8(offset + index, word.charCodeAt(index));
    }
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      44 + index * 2,
      Math.round(clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff),
      true,
    );
  });
  return bytes;
}

/** Bytes as base64, in chunks so a long message does not overflow the call stack. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

/**
 * A recorded call (m4a, mp3, ogg or whatever the phone keeps) as WAV, mono at the phone's own
 * rate, up to `callMaxSeconds`: how long it runs, and whether its end was left out.
 */
export async function callForReading(
  file: Blob,
): Promise<{ readonly wav: Uint8Array; readonly seconds: number; readonly cut: boolean }> {
  // Decoded straight at the phone's rate, so a long call does not fill the phone's memory.
  const decoder = new AudioContext({ sampleRate: callRate });
  try {
    const decoded = await decoder.decodeAudioData(await file.arrayBuffer());
    const seconds = Math.min(decoded.duration, callMaxSeconds);
    const offline = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(seconds * callRate)),
      callRate,
    );
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return {
      wav: encodeWav(rendered.getChannelData(0), callRate),
      seconds: Math.round(seconds * 10) / 10,
      cut: decoded.duration > callMaxSeconds,
    };
  } finally {
    void decoder.close();
  }
}

/**
 * A recording (webm, mp4 or whatever the device records) as base64 WAV, mono at 16 kHz, which
 * every model reads and keeps the voice's tone.
 */
export async function voiceForReading(recording: Blob): Promise<string> {
  const decoder = new AudioContext();
  try {
    const decoded = await decoder.decodeAudioData(await recording.arrayBuffer());
    const length = Math.max(1, Math.ceil(decoded.duration * voiceRate));
    const offline = new OfflineAudioContext(1, length, voiceRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return toBase64(encodeWav(rendered.getChannelData(0), voiceRate));
  } finally {
    void decoder.close();
  }
}
