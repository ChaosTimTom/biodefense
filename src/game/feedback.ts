import { loadSave } from "./save";
import type { AudioCue, HapticCue } from "./theme";

const AUDIO_MAP: Record<AudioCue, { frequency: number; duration: number; type: OscillatorType; gain: number }> = {
  ui_tap: { frequency: 520, duration: 0.04, type: "triangle", gain: 0.02 },
  ui_toggle: { frequency: 640, duration: 0.05, type: "triangle", gain: 0.024 },
  tool_place: { frequency: 720, duration: 0.07, type: "sine", gain: 0.03 },
  turn_step: { frequency: 300, duration: 0.08, type: "triangle", gain: 0.028 },
  spread: { frequency: 380, duration: 0.05, type: "sawtooth", gain: 0.018 },
  kill: { frequency: 190, duration: 0.12, type: "square", gain: 0.025 },
  win: { frequency: 880, duration: 0.18, type: "triangle", gain: 0.03 },
  lose: { frequency: 150, duration: 0.22, type: "sawtooth", gain: 0.022 },
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

export function playCue(cue: AudioCue): void {
  const save = loadSave();
  if (!save.preferences.audioEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const spec = AUDIO_MAP[cue];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = spec.type;
  osc.frequency.setValueAtTime(spec.frequency, now);
  gain.gain.setValueAtTime(spec.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + spec.duration);
}

export function triggerHaptic(cue: HapticCue): void {
  const save = loadSave();
  if (!save.preferences.hapticsEnabled) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;

  const pattern = cue === "soft"
    ? 10
    : cue === "medium"
      ? 20
      : cue === "success"
        ? [16, 22, 26]
        : [30, 24, 40];

  navigator.vibrate(pattern);
}

