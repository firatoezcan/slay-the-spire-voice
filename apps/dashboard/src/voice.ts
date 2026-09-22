export async function recordUtterance(
  onStatus: (status: string) => void,
  submit: (samples: number[]) => Promise<void>,
) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silence = context.createGain();
  silence.gain.value = 0;
  const chunks: Float32Array[] = [];
  let stopped = false;
  source.connect(processor);
  processor.connect(silence);
  silence.connect(context.destination);
  processor.onaudioprocess = (event) => {
    if (!stopped)
      chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  onStatus("Recording…");
  const stop = async (discard = false) => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    const rate = context.sampleRate;
    await context.close();
    if (discard) return;
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const pcm = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      pcm.set(chunk, offset);
      offset += chunk.length;
    }
    const ratio = rate / 16000;
    const samples = Array.from(
      { length: Math.min(480000, Math.floor(total / ratio)) },
      (_, i) => {
        const start = Math.floor(i * ratio),
          end = Math.min(total, Math.floor((i + 1) * ratio));
        let sum = 0;
        for (let n = start; n < end; n++) sum += pcm[n]!;
        return Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
      },
    );
    if (samples.length < 1600) {
      onStatus("Record at least a moment of speech.");
      return;
    }
    onStatus("Transcribing…");
    try {
      await submit(samples);
      onStatus("Ready to record");
    } catch (error) {
      onStatus(String(error));
    }
  };
  const timer = setTimeout(() => void stop(), 29000);
  return { stop: () => stop(), cancel: () => stop(true) };
}
