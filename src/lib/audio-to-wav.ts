// Gemini'ning audio (inlineData) API'si rasmiy ravishda WAV/MP3/AIFF/AAC/OGG/FLAC'ni
// qo'llaydi — WEBM (brauzer MediaRecorder'ining standart formati) ro'yxatda yo'q va
// amalda yuborilganda Gemini javob bermay (yoki juda sekin) osilib qolishiga olib
// keldi. Shu sababli brauzerda yozib olingan audio serverga yuborishdan oldin shu
// yerda WAV'ga o'giriladi — hech qanday server tomonidagi bog'liqlik (ffmpeg va h.k.)
// talab qilinmaydi.
export async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  await ctx.close();

  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  // Mono'ga tekislaymiz (kanallarni o'rtachalaymiz) — nutq uchun yetarli va
  // fayl hajmini kichraytiradi.
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[i] / numChannels;
  }

  const bytesPerSample = 2;
  const dataSize = length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, s: string) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
