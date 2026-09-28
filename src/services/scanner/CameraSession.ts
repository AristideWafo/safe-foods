export class CameraSession {
  private stream?: MediaStream;

  get isActive() { return this.stream?.active === true; }

  async start(video: HTMLVideoElement): Promise<void> {
    await this.stop(video);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    this.stream = stream;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (error) {
      if (video.srcObject === stream) video.srcObject = null;
      stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
      throw error;
    }
  }

  async stop(video: HTMLVideoElement | null): Promise<void> {
    if (video) { video.pause(); video.srcObject = null; }
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
  }

  supportsTorch(): boolean {
    const track = this.stream?.getVideoTracks()[0];
    return Boolean((track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean } | undefined)?.torch);
  }

  async setTorch(enabled: boolean): Promise<void> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) throw new Error('Caméra indisponible.');
    await track.applyConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] });
  }
}
