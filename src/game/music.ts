import type Phaser from "phaser";
import { loadSave, totalScore, type SaveData } from "./save";

export type MusicTrackId =
  | "glitch_in_the_petri_dish"
  | "pixelated_peaks_of_aethelgard"
  | "glitch_in_the_petri_dish_alt"
  | "pixel_plague_overture_1"
  | "pixel_plague_overture_2"
  | "pixel_plague_overture_3"
  | "pixel_plague_overture_4"
  | "pixel_plague_overture_5"
  | "boss_level";

export interface MusicTrack {
  id: MusicTrackId;
  title: string;
  file: string;
  unlockScore?: number;
  starter?: boolean;
  bossTrack?: boolean;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "glitch_in_the_petri_dish",
    title: "Glitch in the Petri Dish",
    file: "assets/music/glitch_in_the_petri_dish.wav",
    starter: true,
  },
  {
    id: "pixelated_peaks_of_aethelgard",
    title: "Pixelated Peaks of Aethelgard",
    file: "assets/music/pixelated_peaks_of_aethelgard.wav",
    starter: true,
  },
  {
    id: "glitch_in_the_petri_dish_alt",
    title: "Glitch in the Petri Dish Alt",
    file: "assets/music/glitch_in_the_petri_dish_alt.wav",
    unlockScore: 5000,
  },
  {
    id: "pixel_plague_overture_1",
    title: "Pixel Plague Overture I",
    file: "assets/music/pixel_plague_overture_1.wav",
    unlockScore: 12000,
  },
  {
    id: "pixel_plague_overture_2",
    title: "Pixel Plague Overture II",
    file: "assets/music/pixel_plague_overture_2.wav",
    unlockScore: 22000,
  },
  {
    id: "pixel_plague_overture_3",
    title: "Pixel Plague Overture III",
    file: "assets/music/pixel_plague_overture_3.wav",
    unlockScore: 35000,
  },
  {
    id: "pixel_plague_overture_4",
    title: "Pixel Plague Overture IV",
    file: "assets/music/pixel_plague_overture_4.wav",
    unlockScore: 50000,
  },
  {
    id: "pixel_plague_overture_5",
    title: "Pixel Plague Overture V",
    file: "assets/music/pixel_plague_overture_5.wav",
    unlockScore: 70000,
  },
  {
    id: "boss_level",
    title: "Boss Level",
    file: "assets/music/boss_level.wav",
    bossTrack: true,
  },
];

const BOSS_LEVEL_IDS = [50, 100, 150, 200];
const DEFAULT_SELECTED_TRACK: MusicTrackId = "glitch_in_the_petri_dish";
const BOSS_TRACK_ID: MusicTrackId = "boss_level";

let currentAudio: HTMLAudioElement | null = null;
let currentTrackId: MusicTrackId | null = null;
let currentMode: "shuffle" | "selected" | null = null;
let currentBossContext = false;

function getTrack(id: MusicTrackId | string | null | undefined): MusicTrack | null {
  return MUSIC_TRACKS.find((track) => track.id === id) ?? null;
}

function normalizeSelectedTrack(save: SaveData): MusicTrackId {
  const selected = getTrack(save.preferences.selectedTrackId);
  if (selected && isTrackUnlockedForGeneralPlay(save, selected.id)) {
    return selected.id;
  }
  return DEFAULT_SELECTED_TRACK;
}

function randomFrom<T>(items: T[], exclude?: T | null): T {
  if (items.length === 1) return items[0];
  const pool = exclude == null ? items : items.filter((item) => item !== exclude);
  return pool[Math.floor(Math.random() * pool.length)] ?? items[0];
}

function isAnyBossCleared(save: SaveData): boolean {
  return BOSS_LEVEL_IDS.some((levelId) => (save.stars[levelId] ?? 0) > 0);
}

export function isTrackUnlockedForGeneralPlay(save: SaveData, trackId: MusicTrackId): boolean {
  const track = getTrack(trackId);
  if (!track) return false;
  if (track.starter) return true;
  if (track.bossTrack) return isAnyBossCleared(save);
  return totalScore(save) >= (track.unlockScore ?? Number.MAX_SAFE_INTEGER);
}

export function getUnlockedGeneralTracks(save: SaveData): MusicTrack[] {
  return MUSIC_TRACKS.filter((track) => !track.bossTrack && isTrackUnlockedForGeneralPlay(save, track.id));
}

export function getSelectableTracks(save: SaveData): MusicTrack[] {
  return MUSIC_TRACKS.filter((track) => isTrackUnlockedForGeneralPlay(save, track.id));
}

export function getNextMusicUnlock(save: SaveData): { title: string; score: number } | null {
  const total = totalScore(save);
  const next = MUSIC_TRACKS
    .filter((track) => !track.starter && !track.bossTrack && !isTrackUnlockedForGeneralPlay(save, track.id))
    .sort((a, b) => (a.unlockScore ?? 0) - (b.unlockScore ?? 0))[0];

  if (!next || next.unlockScore == null) return null;
  if (total >= next.unlockScore) return null;
  return { title: next.title, score: next.unlockScore };
}

function stopAudio(): void {
  currentAudio?.pause();
  if (currentAudio) {
    currentAudio.currentTime = 0;
  }
  currentAudio = null;
  currentTrackId = null;
  currentMode = null;
  currentBossContext = false;
}

function playTrack(track: MusicTrack, mode: "shuffle" | "selected", bossContext: boolean): void {
  if (typeof window === "undefined") return;

  if (currentAudio && currentTrackId === track.id && currentMode === mode && currentBossContext === bossContext) {
    if (currentAudio.paused) {
      void currentAudio.play().catch(() => {});
    }
    return;
  }

  stopAudio();

  const audio = new Audio(new URL(track.file, window.location.href).toString());
  audio.preload = "metadata";
  audio.volume = 0.42;
  audio.loop = mode === "selected" || bossContext;
  audio.addEventListener("ended", () => {
    if (audio !== currentAudio || mode !== "shuffle" || bossContext) return;
    const save = loadSave();
    const pool = getUnlockedGeneralTracks(save);
    if (pool.length === 0) return;
    playTrack(randomFrom(pool, getTrack(currentTrackId)), "shuffle", false);
  });

  currentAudio = audio;
  currentTrackId = track.id;
  currentMode = mode;
  currentBossContext = bossContext;
  void audio.play().catch(() => {});
}

function isBossScene(scene: Phaser.Scene): boolean {
  return Boolean((scene as { levelSpec?: { boss?: unknown } }).levelSpec?.boss);
}

export function syncSceneMusic(scene: Phaser.Scene, force = false): void {
  const save = loadSave();
  if (!save.preferences.audioEnabled) {
    stopAudio();
    return;
  }

  const bossContext = isBossScene(scene);
  const mode = save.preferences.musicMode;

  if (bossContext && mode === "shuffle") {
    const bossTrack = getTrack(BOSS_TRACK_ID);
    if (bossTrack) playTrack(bossTrack, "shuffle", true);
    return;
  }

  if (mode === "selected") {
    const selected = getTrack(normalizeSelectedTrack(save));
    if (selected) playTrack(selected, "selected", false);
    return;
  }

  const pool = getUnlockedGeneralTracks(save);
  if (pool.length === 0) {
    stopAudio();
    return;
  }

  if (!force && currentAudio && currentMode === "shuffle" && !currentBossContext && currentTrackId && pool.some((track) => track.id === currentTrackId)) {
    if (currentAudio.paused) {
      void currentAudio.play().catch(() => {});
    }
    return;
  }

  playTrack(randomFrom(pool, force ? null : getTrack(currentTrackId)), "shuffle", false);
}

export function refreshSceneMusic(scene: Phaser.Scene): void {
  syncSceneMusic(scene, true);
}

export function getCurrentTrackTitle(): string | null {
  return getTrack(currentTrackId)?.title ?? null;
}
