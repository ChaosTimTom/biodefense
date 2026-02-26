// ═══════════════════════════════════════════════════
// src/game/animation/tweens.ts — Reusable tween definitions
// Bio Defence v3: Simplified for Game of Life model
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { ANIM } from "../../sim/constants";
import { UI, PATHOGEN_COLORS, TILE_SIZE, tileX, tileY } from "../config";
import type { PathogenType } from "../../sim/types";

// ── Helper: create a temp graphic for a pathogen at tile position ──
export function createPathogenCircle(
  scene: Phaser.Scene,
  gx: number,
  gy: number,
  offsetX: number,
  offsetY: number,
  pathogen: PathogenType,
  radius: number = TILE_SIZE * 0.32,
): Phaser.GameObjects.Arc {
  const px = tileX(gx, offsetX) + TILE_SIZE / 2;
  const py = tileY(gy, offsetY) + TILE_SIZE / 2;
  return scene.add.circle(px, py, radius, PATHOGEN_COLORS[pathogen], 1);
}

// ── Pathogen Spread: new pathogen pops in with scale bounce ──
export function tweenSpread(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  onComplete?: () => void,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    scaleX: { from: 0, to: 1 },
    scaleY: { from: 0, to: 1 },
    alpha: { from: 0, to: 1 },
    duration: ANIM.spread,
    ease: "Back.easeOut",
    onComplete: () => onComplete?.(),
  });
}

// ── Pathogen Kill: shrink + fade out ──
export function tweenKill(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  onComplete?: () => void,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    scaleX: 0,
    scaleY: 0,
    alpha: 0,
    duration: ANIM.kill,
    ease: "Quad.easeIn",
    onComplete: () => {
      (target as Phaser.GameObjects.Arc).destroy();
      onComplete?.();
    },
  });
}

// ── Tool Placement: quick flash pulse ──
export function tweenToolPlace(
  scene: Phaser.Scene,
  tileGraphic: Phaser.GameObjects.GameObject,
  onComplete?: () => void,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: tileGraphic,
    alpha: { from: 0.5, to: 1 },
    scaleX: { from: 1.2, to: 1 },
    scaleY: { from: 1.2, to: 1 },
    duration: ANIM.toolPlace,
    ease: "Quad.easeOut",
    onComplete: () => onComplete?.(),
  });
}

// ── Virus Burst: expanding ring ──
export function tweenVirusBurst(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  onComplete?: () => void,
): Phaser.Tweens.Tween {
  const ring = scene.add.circle(cx, cy, 8, 0xf44336, 0.7);
  return scene.tweens.add({
    targets: ring,
    scaleX: 5,
    scaleY: 5,
    alpha: 0,
    duration: ANIM.burst,
    ease: "Quad.easeOut",
    onComplete: () => {
      ring.destroy();
      onComplete?.();
    },
  });
}

// ── Win Sequence: big golden burst ──
export function tweenWinBurst(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  onComplete?: () => void,
): void {
  const particles: Phaser.GameObjects.Arc[] = [];
  const count = 16;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const p = scene.add.circle(cx, cy, 4, UI.accentGold, 1);
    particles.push(p);

    scene.tweens.add({
      targets: p,
      x: cx + Math.cos(angle) * 120,
      y: cy + Math.sin(angle) * 120,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: ANIM.winSequence,
      ease: "Quad.easeOut",
      onComplete: () => {
        p.destroy();
        if (i === count - 1) onComplete?.();
      },
    });
  }
}

// ── Lose Sequence: screen shake + red flash ──
export function tweenLoseShake(
  scene: Phaser.Scene,
  camera: Phaser.Cameras.Scene2D.Camera,
  onComplete?: () => void,
): void {
  camera.shake(ANIM.loseSequence, 0.01);
  camera.flash(ANIM.loseSequence / 2, 255, 0, 0, false, (_cam: unknown, progress: number) => {
    if (progress >= 1) onComplete?.();
  });
}

// ── Turn Transition: subtle grid pulse ──
export function tweenTurnTransition(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: container,
    alpha: { from: 0.85, to: 1 },
    duration: ANIM.turnTransition,
    ease: "Linear",
  });
}
