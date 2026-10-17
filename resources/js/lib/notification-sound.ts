/**
 * A short two-note chime for a new notification, synthesised with Web Audio
 * (no sound file to ship). Browsers only allow audio after the user has
 * interacted with the page, so the context is created lazily and resumed;
 * when it is still blocked the chime is skipped silently.
 */
let ctx: AudioContext | null = null;

export function playNotificationSound() {
    try {
        ctx ??= new AudioContext();
        if (ctx.state === 'suspended') void ctx.resume();
        const now = ctx.currentTime;
        [880, 1318.5].forEach((freq, i) => {
            const start = now + i * 0.12;
            const osc = ctx!.createOscillator();
            const gain = ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
            osc.connect(gain).connect(ctx!.destination);
            osc.start(start);
            osc.stop(start + 0.5);
        });
    } catch {
        /* no Web Audio: stay silent */
    }
}
