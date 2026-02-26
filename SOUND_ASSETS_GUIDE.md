# Bio Defence — Sound Assets Guide

Every sound effect and music track needed for the game, with free sources.

---

## Free Sound Sources (All Allow Commercial Use)

| Source | License | URL |
|--------|---------|-----|
| **Freesound.org** | CC0 / CC-BY (per file) | https://freesound.org |
| **Mixkit** | Free license (no attribution) | https://mixkit.co/free-sound-effects/ |
| **Pixabay** | Pixabay License (free, no attribution) | https://pixabay.com/sound-effects/ |
| **Kenney.nl** | CC0 (Public Domain) | https://kenney.nl/assets?t=audio |
| **OpenGameArt.org** | CC0 / CC-BY (per file) | https://opengameart.org |
| **SONNISS GDC Bundle** | Royalty-free | https://sonniss.com/gameaudiogdc (annual free packs) |
| **ZapSplat** | Free with attribution | https://www.zapsplat.com |

> **Recommendation:** Start with **Mixkit** and **Pixabay** for hassle-free licensing (no attribution needed). Use **Freesound** when you need something specific.

---

## Audio Format

- **Format:** `.ogg` (primary) + `.mp3` (fallback for Safari)
- **Sample rate:** 44.1 kHz
- **Bit depth:** 16-bit
- **Music:** 128-192 kbps
- **SFX:** normalize to -3 dB peak, trim silence, keep under 2 seconds

Use [Audacity](https://www.audacityteam.org/) (free) to convert, trim, normalize, and export.

---

## Sound Effects (32 sounds)

### Tool Placement Sounds

| # | Filename | Description | Search Terms | Suggested Source |
|---|----------|-------------|-------------|-----------------|
| 1 | `sfx_antibiotic.ogg` | Short clean "pop" or pill-dispensing sound, clinical, satisfying | "pill pop", "medicine click", "clinical pop" | Mixkit: "click pop" |
| 2 | `sfx_antiviral.ogg` | Syringe injection / liquid spray, brief whoosh | "syringe", "spray", "injection" | Freesound: search "syringe" |
| 3 | `sfx_barrier.ogg` | Solid thud or block placement, weighty | "stone place", "block thud", "wall place" | Mixkit: "heavy click" |
| 4 | `sfx_immune_booster.ogg` | Uplifting chime + shield activation, protective feel | "shield up", "power up chime", "buff activate" | Pixabay: "power up" |
| 5 | `sfx_crispr_patch.ogg` | Sci-fi gene-editing zap, precise techy sound | "laser precision", "sci-fi click", "tech zap" | Mixkit: "tech notification" |
| 6 | `sfx_heat_lamp.ogg` | Warm electrical hum burst, heat activation | "heat buzz", "electric warm", "lamp on" | Freesound: search "heat lamp" or "electric buzz" |
| 7 | `sfx_quarantine.ogg` | Containment lockdown — metallic seal + deep bass hit | "lockdown", "seal door", "containment" | Freesound: search "airlock" or "seal" |
| 8 | `sfx_chain_catalyst.ogg` | Energetic electric crackle, catalyst ignition | "electric spark", "energy charge", "lightning" | Mixkit: "electric zap" |

### Germ Event Sounds

| # | Filename | Description | Search Terms | Suggested Source |
|---|----------|-------------|-------------|-----------------|
| 9 | `sfx_germ_spread.ogg` | Soft squelchy growth, organic expansion | "slime", "organic grow", "wet spread" | Freesound: search "slime" filter short |
| 10 | `sfx_germ_kill.ogg` | Satisfying pop/burst, cell destruction | "bubble pop", "cell burst", "splat" | Mixkit: "bubble pop" |
| 11 | `sfx_germ_convert.ogg` | Morphing/transformation sound, brief warble | "morph", "transform", "warp short" | Pixabay: "morph" |
| 12 | `sfx_mutation.ogg` | Ominous rising tone + distortion, evolution | "mutate", "evolve", "dark power up" | Freesound: "dark power up" or "mutation" |
| 13 | `sfx_spore_wake.ogg` | Cracking/hatching sound, emergence | "egg crack", "hatch", "shell break" | Mixkit: "crack" |
| 14 | `sfx_prion_convert.ogg` | Deep dark absorption sound, void-like | "dark absorb", "void", "consumption" | Freesound: search "dark absorption" |
| 15 | `sfx_prion_starve.ogg` | Withering/dissolving sound, fading away | "dissolve", "fade", "wither" | Pixabay: "dissolve" |
| 16 | `sfx_parasite_hijack.ogg` | Quick snatching/grabbing sound, predatory | "snatch", "grab", "quick steal" | Mixkit: "whoosh grab" |
| 17 | `sfx_biofilm_cluster.ogg` | Connecting/linking sound, shields up | "connect", "link", "shield form" | Freesound: search "shield link" |
| 18 | `sfx_resistance.ogg` | Warning: harsh buzzer/alarm, things went wrong | "alarm buzz", "error", "warning beep" | Mixkit: "wrong buzzer" |

### Chain Reaction Sounds

| # | Filename | Description | Search Terms | Suggested Source |
|---|----------|-------------|-------------|-----------------|
| 19 | `sfx_chain_pop.ogg` | Individual chain link pop (played rapidly in sequence) | "small pop", "bubble", "ping" | Mixkit: "short pop" |
| 20 | `sfx_chain_complete.ogg` | Big satisfying combo finish sound, rewarding | "combo", "achievement", "big success" | Pixabay: "success fanfare short" |

### Immune Cell Sounds

| # | Filename | Description | Search Terms | Suggested Source |
|---|----------|-------------|-------------|-----------------|
| 21 | `sfx_immune_pushback.ogg` | Shield bash or push impact, defensive strike | "shield bash", "push", "force hit" | Mixkit: "impact hit" |
| 22 | `sfx_immune_deploy.ogg` | Deployment / activation chime, hopeful | "deploy", "activate", "station" | Pixabay: "notification chime" |

### UI & Game Flow Sounds

| # | Filename | Description | Search Terms | Suggested Source |
|---|----------|-------------|-------------|-----------------|
| 23 | `sfx_btn_click.ogg` | Clean UI button click | "ui click", "button press", "menu click" | Kenney: UI Audio pack |
| 24 | `sfx_btn_hover.ogg` | Soft hover/highlight sound | "hover", "soft tick", "menu hover" | Kenney: UI Audio pack |
| 25 | `sfx_turn_advance.ogg` | Turn transition tick/whoosh, the clock advancing | "tick", "clock advance", "turn" | Mixkit: "clock tick" |
| 26 | `sfx_win.ogg` | Victory jingle, 2-3 seconds, uplifting | "victory", "win jingle", "level complete" | Mixkit: "game level complete" |
| 27 | `sfx_lose.ogg` | Defeat sound, 1-2 seconds, somber but not harsh | "game over", "defeat", "fail" | Mixkit: "game over" |
| 28 | `sfx_star_earn.ogg` | Star ping (played per star earned), bright | "star", "coin", "ding" | Pixabay: "coin ding" |
| 29 | `sfx_level_unlock.ogg` | Unlock/reveal sound, satisfying | "unlock", "reveal", "open" | Mixkit: "unlock" |
| 30 | `sfx_world_unlock.ogg` | Bigger unlock sound, achievement | "achievement", "big unlock", "fanfare" | Pixabay: "achievement" |
| 31 | `sfx_tool_select.ogg` | Selecting a tool from palette, subtle | "select", "equip", "pick up" | Kenney: UI Audio pack |
| 32 | `sfx_invalid.ogg` | Can't place here — soft error buzz | "error", "wrong", "invalid" | Kenney: UI Audio pack |

---

## Music Tracks (6 tracks)

Ambient electronic with a clinical/sci-fi feel. Loop-friendly. ~2-4 minutes each.

| # | Filename | Where It Plays | Mood | Search Terms |
|---|----------|---------------|------|-------------|
| 1 | `music_menu.ogg` | Title screen, level select | Calm, mysterious, inviting | "ambient menu", "sci-fi ambient", "mysterious electronic" |
| 2 | `music_world1.ogg` | World 1 levels (Hospital) | Clean, clinical, light tension | "medical ambient", "lab music", "clinical electronic" |
| 3 | `music_world2.ogg` | World 2 levels (Field) | Warmer, slight urgency | "field ambient", "warm tension", "documentary electronic" |
| 4 | `music_world3.ogg` | World 3 levels (Bunker) | Dark, industrial, pressure | "dark industrial ambient", "bunker music", "tense electronic" |
| 5 | `music_world4.ogg` | World 4 levels (Biohazard) | Intense, dangerous, high-stakes | "biohazard ambient", "danger electronic", "intense sci-fi" |
| 6 | `music_world5.ogg` | World 5 levels (Void) | Alien, ethereal, cosmic dread | "cosmic horror ambient", "alien void", "deep space ambient" |

### Recommended Free Music Sources

| Source | Notes | URL |
|--------|-------|-----|
| **Pixabay Music** | Large library, no attribution needed | https://pixabay.com/music/ |
| **FreePD.com** | Public domain, fully free | https://freepd.com |
| **incompetech (Kevin MacLeod)** | CC-BY, huge library, searchable by feel | https://incompetech.com/music/ |
| **Bensound** | Free tier available, some require attribution | https://www.bensound.com |
| **Purple Planet** | Royalty-free, attribution in free tier | https://www.purple-planet.com |

> **Best bet for this game:** Search **Pixabay Music** with terms like "ambient electronic dark" or "sci-fi puzzle". These typically give clean, loop-friendly tracks perfect for puzzle games. Alternatively, Kevin MacLeod's library on incompetech has hundreds of atmospheric tracks.

---

## File Organization

```
assets/sounds/
  sfx/
    sfx_antibiotic.ogg
    sfx_antiviral.ogg
    sfx_barrier.ogg
    sfx_immune_booster.ogg
    sfx_crispr_patch.ogg
    sfx_heat_lamp.ogg
    sfx_quarantine.ogg
    sfx_chain_catalyst.ogg
    sfx_germ_spread.ogg
    sfx_germ_kill.ogg
    sfx_germ_convert.ogg
    sfx_mutation.ogg
    sfx_spore_wake.ogg
    sfx_prion_convert.ogg
    sfx_prion_starve.ogg
    sfx_parasite_hijack.ogg
    sfx_biofilm_cluster.ogg
    sfx_resistance.ogg
    sfx_chain_pop.ogg
    sfx_chain_complete.ogg
    sfx_immune_pushback.ogg
    sfx_immune_deploy.ogg
    sfx_btn_click.ogg
    sfx_btn_hover.ogg
    sfx_turn_advance.ogg
    sfx_win.ogg
    sfx_lose.ogg
    sfx_star_earn.ogg
    sfx_level_unlock.ogg
    sfx_world_unlock.ogg
    sfx_tool_select.ogg
    sfx_invalid.ogg
  music/
    music_menu.ogg
    music_world1.ogg
    music_world2.ogg
    music_world3.ogg
    music_world4.ogg
    music_world5.ogg
```

---

## Quick-Start Checklist

1. **Download [Audacity](https://www.audacityteam.org/)** (free audio editor)
2. **SFX:** Go to Mixkit/Pixabay, search the terms above, download WAV/MP3
3. **Trim** each SFX to under 2 seconds, normalize to -3 dB, export as `.ogg`
4. **Music:** Go to Pixabay Music, search "ambient electronic dark puzzle" etc.
5. **Trim** music to clean loop points (~2-4 min), export as `.ogg` at 128 kbps
6. **Place files** in `assets/sounds/sfx/` and `assets/sounds/music/`
7. **Fall back:** Also export `.mp3` versions of each file for Safari compatibility

### Total Sound Assets: 38 files (32 SFX + 6 music tracks)
