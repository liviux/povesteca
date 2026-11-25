// The moving scene behind the page in the three "live" themes (Ie, Teatru de umbre, Radio cu lămpi).
// It's downloaded only when one of them is chosen (see main.jsx); the other themes never load three.js.
// The canvas sits behind the page and never takes a tap: the page's own links and buttons always win.
// A tap on an empty spot of the page (not on a link, button, card or field) goes to the scene.
import { WebGLRenderer } from 'three';

export const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const dark = () => document.documentElement.hasAttribute('data-dark');

// what counts as "the page's own": a tap there is never the scene's
const OWN = 'a, button, input, select, textarea, label, summary, [role="button"], [role="listbox"], .card, .vrow, .dock, .theme-pop, .search, dialog, .night, iframe, .yt-frame, .yt-note';

export function makeStage({ alpha = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'low-power' });
  } catch (e) {
    console.warn('fx: no WebGL, the theme stays still', e);
    return null; // the theme's CSS alone still looks finished
  }
  document.body.prepend(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

  const size = { w: innerWidth, h: innerHeight };
  // x, y in CSS pixels from the top left; nx, ny from -1 to 1 (ny up); still: no pointer seen yet
  const pointer = { x: size.w / 2, y: size.h / 2, nx: 0, ny: 0, seen: false, at: 0 };
  const resizers = new Set(), tappers = new Set();
  const off = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); off.push(() => target.removeEventListener(type, fn, opts)); };

  const resize = () => {
    size.w = innerWidth; size.h = innerHeight;
    renderer.setSize(size.w, size.h, false);
    resizers.forEach((f) => f(size));
  };
  on(window, 'resize', resize);
  on(window, 'pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.nx = (e.clientX / size.w) * 2 - 1; pointer.ny = -((e.clientY / size.h) * 2 - 1);
    pointer.seen = true; pointer.at = performance.now();
  }, { passive: true });
  on(window, 'pointerdown', (e) => {
    if (e.button || e.target.closest?.(OWN)) return;
    tappers.forEach((f) => f(e.clientX, e.clientY, e));
  });

  let loopFn = null;
  const start = () => renderer.setAnimationLoop(loopFn && !calm() ? (t) => loopFn(t / 1000) : null);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  on(motion, 'change', () => { start(); loopFn?.(performance.now() / 1000); });

  const stage = {
    canvas, renderer, size, pointer,
    onResize: (f) => { resizers.add(f); f(size); },
    onTap: (f) => tappers.add(f),
    on,
    // f(seconds) runs every frame; with "reduce motion" it runs once, so the scene still shows, standing still
    loop(f) { loopFn = f; start(); if (calm()) f(performance.now() / 1000); },
    dispose() {
      renderer.setAnimationLoop(null);
      off.forEach((f) => f());
      renderer.dispose();
      renderer.forceContextLoss(); // browsers keep only a few contexts; switching themes often must not run out
      canvas.remove();
    },
  };
  resize();
  return stage;
}
