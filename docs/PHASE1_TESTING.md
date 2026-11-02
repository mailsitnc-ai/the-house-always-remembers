# Phase 1 prototype: how to run and test

```bash
npm run dev        # http://127.0.0.1:5173  (open in Chrome, then Safari)
npm run build && npm run preview   # production build on http://127.0.0.1:4173
```

## Controls
WASD move · Shift run · Mouse look · E interact · F flashlight · Esc pause · F3 performance overlay.

## Playthrough (the vertical slice)
1. Walk the hallway (flickering lamp). Take the open doorway on the right into the living room.
2. Turn the cabinet lamp on, switch the radio on (positional static), listen for the wall clock.
3. Open the cabinet drawer, examine the index card (mouse turns it, E puts it away).
4. Use the keypad beside the east door, enter the code from the card. The door unlocks; open it.
5. Esc opens the pause menu (render scale, volume, performance overlay).

## What to record (Chrome, then Safari)
Open the overlay (F3) and walk the same route in each browser for about a minute. Note:
- fps, avg / p95 / p99 / max frame ms, and hitch count (frames over 33 ms)
- load marks (engine-ready, world-built, scene-ready, first-frame)
- JS heap (Chrome only; Safari does not expose it)
- the render scale you used (default 75%)

`window.__perf.report()` in the console returns the same numbers as JSON.

## Safari checklist
- [ ] Page loads, menu appears, no console errors
- [ ] "Enter the house" locks the pointer; mouse look works; Esc pauses
- [ ] Audio starts after the click (ambience, radio static, clock tick, footsteps)
- [ ] Flashlight shadows render; lamp light does not leak between rooms
- [ ] Drawer, card inspection, keypad and door all work
- [ ] Frame pacing feels steady; compare the overlay numbers with Chrome

## Audio check
1. Click "Enter the house": you should hear a soft two-note chime, then a low room tone with a faint draught.
2. Press F3: the last overlay line shows `audio running · master 0.80 · output rms 0.1xx`. `output rms` near 0 means nothing is being produced; `suspended` means the browser blocked it.
3. Esc, then "Play test sound": three rising notes and a short hiss. The status line under the button updates.
4. Drag the volume slider and release: a short blip at the new level.
5. Turn the radio on (living room): static from its position. Stand near the east wall to hear the clock tick.
If you hear nothing while `output rms` is above 0, the sound is leaving the page: check macOS output device and volume, and that the browser tab is not muted.
