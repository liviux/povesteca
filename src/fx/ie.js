// Ie: a linen cloth waving behind the page, with Romanian folk motifs cross-stitched on it.
// The motifs sew themselves in when the theme opens; the pointer presses ripples into the cloth; a tap on an
// empty spot sends the needle there to sew a new motif, stitch by stitch, row by row, like by hand.
// The cloth is one plane bent in the vertex shader; the weave and every stitch (two legs of thread, the second
// on top, with a twist of sheen and a shadow) are drawn in the fragment shader from a small grid texture:
// one texel per stitch with its colour, how far it's sewn and a "pop" when it's done.
import {
  Scene, PerspectiveCamera, PlaneGeometry, ShaderMaterial, Mesh, DataTexture, RGBAFormat, UnsignedByteType, NearestFilter,
  Color, Vector2, Vector3, Vector4, Group, CylinderGeometry, ConeGeometry, TorusGeometry, MeshPhongMaterial,
  DirectionalLight, AmbientLight, TubeGeometry, CatmullRomCurve3, MeshBasicMaterial, CanvasTexture, Quaternion,
} from 'three';
import { makeStage, calm, dark } from './stage.js';

// ---- the motifs, as grids: R red, K black (gold in the dark), . empty -------------------------------------
const art = (rows) => rows.map((r) => r.replace(/ /g, ''));
const MOTIFS = [
  // steaua: the eight-pointed star
  art([
    '. . . . . . K . . . . . .',
    '. . . . . K R K . . . . .',
    '. . K K K R . R K K K . .',
    '. . K R R . . . R R K . .',
    '. . K R . . K . . R K . .',
    '. K R . . K R K . . R K .',
    'K R . . K R K R K . . R K',
    '. K R . . K R K . . R K .',
    '. . K R . . K . . R K . .',
    '. . K R R . . . R R K . .',
    '. . K K K R . R K K K . .',
    '. . . . . K R K . . . . .',
    '. . . . . . K . . . . . .',
  ]),
  // rombul cu cârlige: a rhombus with hooks
  art([
    '. K K . . . . . . . K K .',
    'K . . . . . R . . . . . K',
    'K . . . . R K R . . . . K',
    '. K . . R K . K R . . K .',
    '. . K R K . R . K R K . .',
    '. . R K . R K R . K R . .',
    '. R K . R K . K R . K R .',
    '. . R K . R K R . K R . .',
    '. . K R K . R . K R K . .',
    '. K . . R K . K R . . K .',
    'K . . . . R K R . . . . K',
    'K . . . . . R . . . . . K',
    '. K K . . . . . . . K K .',
  ]),
  // pomul vieții: the tree of life
  art([
    '. . . . . . R . . . . . .',
    '. . . . . R K R . . . . .',
    '. . R . . . K . . . R . .',
    '. R K R . . K . . R K R .',
    '. . R . K . K . K . R . .',
    '. . . . . K K K . . . . .',
    '. . R . . . K . . . R . .',
    '. R K R . . K . . R K R .',
    '. . R . K . K . K . R . .',
    '. . . . . K K K . . . . .',
    '. . . . . . K . . . . . .',
    '. . . R R R K R R R . . .',
    '. . . . R K K K R . . . .',
    '. . . . . R R R . . . . .',
  ]),
  // coarnele berbecului: the ram's horns
  art([
    '. . K K K . . . K K K . .',
    '. K . . . K . K . . . K .',
    'K . . R . . K . . R . . K',
    'K . R K R . K . R K R . K',
    'K . . R . . K . . R . . K',
    '. K . . . R K R . . . K .',
    '. . K K R . K . R K K . .',
    '. . . . . R K R . . . . .',
    '. . . . . . R . . . . . .',
  ]),
  // a small flower, for small screens and quick taps
  art([
    '. . R . R . .',
    '. R K R K R .',
    'R K . K . K R',
    '. R K R K R .',
    'R K . K . K R',
    '. R K R K R .',
    '. . R . R . .',
  ]),
];

// ---- shaders ------------------------------------------------------------------------------------------
const RIPPLES = 10;
const vertex = /* glsl */ `
  uniform float uTime;
  uniform vec4 uRip[${RIPPLES}];   // x, y (world), start time, strength
  uniform vec3 uPress;             // x, y (world), how hard the pointer presses
  uniform vec2 uWorld;             // the visible width and height at z = 0
  varying vec2 vPx;                // where this point sits on the screen, in grid cells (undisturbed)
  varying vec3 vN;
  varying float vH;
  uniform float uCell;
  uniform vec2 uView;

  float height(vec2 p) {
    float h = 0.045 * sin(p.x * 1.1 + uTime * 0.8) * sin(p.y * 0.85 + uTime * 0.55)
            + 0.022 * sin(p.x * 2.7 - uTime * 1.5 + p.y * 1.3)
            + 0.012 * sin(p.y * 4.1 + uTime * 2.1 + p.x * 0.7);
    for (int i = 0; i < ${RIPPLES}; i++) {
      vec4 r = uRip[i];
      float age = uTime - r.z;
      if (r.w <= 0.0 || age < 0.0 || age > 4.0) continue;
      float d = distance(p, r.xy);
      float front = d - age * 1.6;
      h += r.w * exp(-age * 1.3) * exp(-front * front * 5.0) * sin(front * 16.0);
    }
    vec2 dp = p - uPress.xy;
    h -= uPress.z * 0.09 * exp(-dot(dp, dp) * 9.0);
    return h;
  }
  void main() {
    vec3 p = position;
    float e = 0.02;
    float h = height(p.xy);
    vec3 dx = vec3(e, 0.0, height(p.xy + vec2(e, 0.0)) - h);
    vec3 dy = vec3(0.0, e, height(p.xy + vec2(0.0, e)) - h);
    vN = normalize(cross(dx, dy));
    vH = h;
    vPx = vec2((p.x / uWorld.x + 0.5) * uView.x, (0.5 - p.y / uWorld.y) * uView.y) / uCell;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, p.y, h, 1.0);
  }
`;
const fragment = /* glsl */ `
  uniform sampler2D uGrid;
  uniform vec2 uGridSize;
  uniform vec3 uLinen, uLinen2, uHole, uRed, uBlack, uShadow;
  uniform float uTime;
  varying vec2 vPx;
  varying vec3 vN;
  varying float vH;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  // distance to the segment a -> a + (b - a) * t, and how far along it the point is
  vec2 seg(vec2 p, vec2 a, vec2 b, float t) {
    vec2 ba = (b - a) * t;
    float l = dot(ba, ba);
    float k = l > 0.0 ? clamp(dot(p - a, ba) / l, 0.0, 1.0) : 0.0;
    return vec2(length(p - a - ba * k), k * t);
  }
  // one leg of thread over the colour below it
  vec3 leg(vec3 below, vec2 f, vec2 a, vec2 b, float t, vec3 col, float w, float dir) {
    if (t <= 0.0) return below;
    vec2 s = seg(f, a, b, t);
    vec2 sh = seg(f - vec2(0.05, -0.07), a, b, t);
    below = mix(below, below * uShadow, (1.0 - smoothstep(w * 0.7, w * 1.6, sh.x)) * 0.55);
    float inside = 1.0 - smoothstep(w - 0.03, w + 0.02, s.x);
    if (inside <= 0.0) return below;
    float prof = sqrt(max(0.0, 1.0 - pow(s.x / w, 2.0)));
    // the strands of the thread twist along it
    float twist = 0.5 + 0.5 * sin(s.y * 26.0 + dir * s.x / w * 2.4);
    vec3 c = col * (0.45 + 0.6 * prof) * (0.82 + 0.3 * twist);
    c += vec3(1.0, 0.95, 0.9) * pow(prof, 8.0) * twist * 0.22;
    return mix(below, c, inside);
  }
  void main() {
    vec2 cell = floor(vPx);
    vec2 f = fract(vPx);
    // the linen: threads one way and the other, a little uneven, with a hole at each corner of a stitch square
    float warp = 0.5 + 0.5 * sin(vPx.x * 6.2832 * 3.0 + noise(vPx * vec2(0.3, 3.0)) * 2.0);
    float weft = 0.5 + 0.5 * sin(vPx.y * 6.2832 * 3.0 + noise(vPx * vec2(3.0, 0.3)) * 2.0);
    float slub = noise(vPx * vec2(0.08, 1.7)) * 0.5 + noise(vPx * vec2(1.9, 0.07)) * 0.5;
    vec3 col = mix(uLinen2, uLinen, 0.55 + 0.25 * max(warp, weft) + 0.2 * slub);
    vec2 corner = abs(f - 0.5);
    float hole = smoothstep(0.43, 0.5, max(corner.x, corner.y)) * smoothstep(0.38, 0.5, min(corner.x, corner.y));
    col = mix(col, uHole, hole * 0.6);

    vec4 g = texelFetch(uGrid, ivec2(cell), 0);
    if (cell.x >= 0.0 && cell.y >= 0.0 && cell.x < uGridSize.x && cell.y < uGridSize.y && g.r > 0.0) {
      vec3 thread = g.r > 0.6 ? uBlack : uRed;
      float p = g.g;
      float w = 0.15 + g.b * 0.07;
      col = leg(col, f, vec2(0.13, 0.87), vec2(0.87, 0.13), clamp(p * 2.0, 0.0, 1.0), thread * 0.92, w, 1.0);
      col = leg(col, f, vec2(0.13, 0.13), vec2(0.87, 0.87), clamp(p * 2.0 - 1.0, 0.0, 1.0), thread, w, -1.0);
    }
    // light on the folds of the cloth
    vec3 L = normalize(vec3(-0.45, 0.6, 0.9));
    float shade = 0.98 + 3.4 * dot(vN.xy, L.xy);
    col *= clamp(shade, 0.7, 1.2);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

// ---- colours -------------------------------------------------------------------------------------------
const PALETTE = {
  light: { linen: '#f3ecdd', linen2: '#e3d8c2', hole: '#b9a888', red: '#b3121d', black: '#221c18', shadow: '#8c7a5c', needle: '#8f99a6' },
  dark: { linen: '#2b251e', linen2: '#1d1914', hole: '#0d0b09', red: '#d63a44', black: '#e2b04f', shadow: '#000000', needle: '#c9ced6' },
};

export function start() {
  const st = makeStage();
  if (!st) return () => {};
  const { renderer, size, pointer } = st;
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  const world = new Vector2();
  const view = new Vector2();
  // cells: one stitch square, in CSS pixels
  let cell = 10, cols = 0, rows = 0, data, tex;

  const uniforms = {
    uTime: { value: 0 }, uRip: { value: Array.from({ length: RIPPLES }, () => new Vector4(0, 0, -99, 0)) },
    uPress: { value: new Vector3(0, 0, 0) }, uWorld: { value: world }, uView: { value: view }, uCell: { value: cell },
    uGrid: { value: null }, uGridSize: { value: new Vector2() },
    uLinen: { value: new Color() }, uLinen2: { value: new Color() }, uHole: { value: new Color() },
    uRed: { value: new Color() }, uBlack: { value: new Color() }, uShadow: { value: new Color() },
  };
  const cloth = new Mesh(new PlaneGeometry(1, 1, 1, 1), new ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment }));
  scene.add(cloth);

  // ---- the needle, its thread and its shadow ----
  const needleMat = new MeshPhongMaterial({ color: 0xdfe3e8, specular: 0xffffff, shininess: 90 });
  const needle = new Group();
  const L = 0.7, R = 0.017, TIP = 0.14;
  const tip = new Mesh(new ConeGeometry(R, TIP, 10), needleMat);
  tip.rotation.x = Math.PI; tip.position.y = TIP / 2;
  const body = new Mesh(new CylinderGeometry(R * 0.9, R, L, 10), needleMat);
  body.position.y = TIP + L / 2;
  const eye = new Mesh(new TorusGeometry(R * 1.6, R * 0.55, 6, 14), needleMat);
  eye.position.y = TIP + L + R * 1.2;
  needle.add(tip, body, eye);
  scene.add(needle);
  scene.add(new AmbientLight(0xffffff, 1.4));
  const sun = new DirectionalLight(0xffffff, 2.6);
  sun.position.set(-3, 4, 6);
  scene.add(sun);

  const threadMat = new MeshBasicMaterial({ color: 0xb3121d });
  let thread = new Mesh(undefined, threadMat);
  scene.add(thread);

  const blob = document.createElement('canvas');
  blob.width = blob.height = 64;
  const bx = blob.getContext('2d');
  const grad = bx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  bx.fillStyle = grad; bx.fillRect(0, 0, 64, 64);
  const shadow = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: new CanvasTexture(blob), transparent: true, depthTest: false, depthWrite: false }));
  shadow.renderOrder = 1;
  scene.add(shadow);

  const colours = () => {
    const p = PALETTE[dark() ? 'dark' : 'light'];
    uniforms.uLinen.value.set(p.linen); uniforms.uLinen2.value.set(p.linen2); uniforms.uHole.value.set(p.hole);
    uniforms.uRed.value.set(p.red); uniforms.uBlack.value.set(p.black); uniforms.uShadow.value.set(p.shadow);
    needleMat.color.set(p.needle);
  };
  colours();
  const darkWatch = new MutationObserver(colours);
  darkWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-dark'] });

  // ---- screen <-> world ----
  const toWorld = (x, y, z = 0) => new Vector3((x / size.w - 0.5) * world.x, (0.5 - y / size.h) * world.y, z);

  // ---- the grid of stitches ----
  // per cell: colour (0 none, 1 red, 2 black), progress 0..1, pop 0..1
  let colour, progress, pop;
  const blooming = new Map(); // cell -> [start, duration]
  const popping = new Set();
  const write = (i) => {
    data[i * 4] = colour[i] === 0 ? 0 : colour[i] === 1 ? 110 : 230;
    data[i * 4 + 1] = Math.round(progress[i] * 255);
    data[i * 4 + 2] = Math.round(pop[i] * 255);
  };
  const cellsOf = (m, cx, cy) => {
    const out = [];
    const h = m.length, w = m[0].length;
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = m[y][x];
      const gx = x0 + x, gy = y0 + y;
      if (ch === '.' || gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
      out.push({ i: gy * cols + gx, c: ch === 'R' ? 1 : 2, x: gx, y: gy });
    }
    return out;
  };
  // random but the same for the same screen, so a resize doesn't reshuffle everything
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function layout(animate) {
    cell = size.w < 600 ? 8 : 10;
    uniforms.uCell.value = cell;
    cols = Math.ceil(size.w / cell) + 1; rows = Math.ceil(size.h / cell) + 1;
    data = new Uint8Array(cols * rows * 4);
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
    colour = new Uint8Array(cols * rows); progress = new Float32Array(cols * rows); pop = new Float32Array(cols * rows);
    tex?.dispose();
    tex = new DataTexture(data, cols, rows, RGBAFormat, UnsignedByteType);
    tex.magFilter = tex.minFilter = NearestFilter;
    tex.needsUpdate = true;
    uniforms.uGrid.value = tex;
    uniforms.uGridSize.value.set(cols, rows);
    blooming.clear(); popping.clear(); jobs.length = 0; job = null;

    // bands of the wave motif up both sides, where the page leaves room, and scattered motifs elsewhere,
    // more of them near the edges than in the middle, where the text is
    seed = 7;
    const placed = [];
    const now = clock();
    const add = (m, cx, cy, delay) => {
      for (const s of cellsOf(m, cx, cy)) {
        colour[s.i] = s.c;
        if (animate) {
          const d = Math.hypot(s.x - cx, s.y - cy);
          blooming.set(s.i, [now + delay + d * 0.06 + rand() * 0.15, 0.35]);
          progress[s.i] = 0;
        } else progress[s.i] = 1;
        write(s.i);
      }
    };
    const gutter = (size.w - 1200) / 2;
    if (gutter > 70) {
      const band = MOTIFS[3];
      for (const cx of [Math.floor(gutter / cell / 2), cols - Math.ceil(gutter / cell / 2) - 1]) {
        for (let cy = 8, k = 0; cy < rows; cy += band.length + 3, k++) add(band, cx, cy, 0.2 + k * 0.25);
      }
    }
    const step = size.w < 600 ? 24 : 30;
    let k = 0;
    for (let cy = step / 2; cy < rows + 6; cy += step * 0.8) {
      for (let cx = (Math.floor(cy / step) % 2) * step / 2; cx < cols + 6; cx += step) {
        const x = cx + (rand() - 0.5) * step * 0.5, y = cy + (rand() - 0.5) * step * 0.4;
        const edge = Math.min(1, Math.abs(x / cols - 0.5) * 2.4);
        if (rand() > 0.22 + 0.7 * edge * edge) continue;
        if (gutter > 70 && (x * cell < gutter || x * cell > size.w - gutter)) continue;
        if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < 16)) continue;
        placed.push([x, y]);
        const m = size.w < 600 && rand() < 0.5 ? MOTIFS[4] : MOTIFS[Math.floor(rand() * 4)];
        add(m, Math.round(x), Math.round(y), 0.1 + (k++ % 12) * 0.22);
      }
    }
    tex.needsUpdate = true;
  }

  // ---- sewing: a queue of motifs, one stitch at a time ----
  const jobs = [];
  let job = null; // { cells, k, t0, per }
  let motifTurn = 0;
  function sew(x, y) {
    const cx = Math.round(x / cell), cy = Math.round(y / cell);
    const m = MOTIFS[(motifTurn++ + (size.w < 600 ? 4 : 0)) % MOTIFS.length];
    // row by row, back and forth, like by hand
    const cells = cellsOf(m, cx, cy).sort((a, b) => a.y - b.y || (a.y % 2 ? b.x - a.x : a.x - b.x));
    for (const s of cells) { blooming.delete(s.i); }
    if (calm()) {
      for (const s of cells) { colour[s.i] = s.c; progress[s.i] = 1; write(s.i); }
      tex.needsUpdate = true;
      return;
    }
    jobs.push({ cells, k: 0, t0: -1, cx, cy });
    ripple(x, y, 0.05);
  }

  let rip = 0;
  function ripple(x, y, strength) {
    const w = toWorld(x, y);
    uniforms.uRip.value[rip++ % RIPPLES].set(w.x, w.y, clock(), strength);
  }

  const t0 = performance.now();
  const clock = () => (performance.now() - t0) / 1000;

  // ---- the needle's place: on a stitch, at the end of the leg being sewn ----
  const tipNow = new Vector3(), tipGoal = new Vector3(), lean = new Vector3(0.28, 0.45, 0.85).normalize();
  const up = new Vector3(0, 1, 0), q = new Quaternion();
  let anchor = null; // where the thread comes out of the cloth
  let lastRip = 0, lastX = 0, lastY = 0;
  let parked = true;

  st.onResize(() => {
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    world.set(2 * 10 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect, 2 * 10 * Math.tan((camera.fov * Math.PI) / 360));
    view.set(size.w, size.h);
    cloth.geometry.dispose();
    // a little larger than the screen, so the edges never show when it waves
    cloth.geometry = new PlaneGeometry(world.x * 1.08, world.y * 1.08, Math.min(220, Math.round(size.w / 7)), Math.min(160, Math.round(size.h / 7)));
    const first = !cols;
    layout(first && !calm());
    tipNow.copy(toWorld(size.w * 0.86, size.h * 0.78, 0.4));
    shadow.scale.setScalar(world.y * 0.05);
    if (calm()) frame(clock());
  });

  st.onTap((x, y) => { sew(x, y); parked = false; });

  function frame(t) {
    uniforms.uTime.value = calm() ? 0 : t;
    let dirty = false;
    // motifs blooming in on their own
    for (const [i, [s, d]] of blooming) {
      const p = Math.min(1, Math.max(0, (t - s) / d));
      if (calm()) progress[i] = 1;
      else progress[i] = p;
      if (progress[i] >= 1) { blooming.delete(i); pop[i] = 1; popping.add(i); }
      write(i); dirty = true;
    }
    // the needle sewing
    if (!job && jobs.length) job = jobs.shift();
    let legT = 0;
    if (job) {
      // quicker when more motifs wait
      const per = jobs.length ? 0.045 : 0.075;
      if (job.t0 < 0) job.t0 = t;
      const pos = (t - job.t0) / per;
      const k = Math.floor(pos);
      for (; job.k < Math.min(k, job.cells.length); job.k++) {
        const s = job.cells[job.k];
        colour[s.i] = s.c; progress[s.i] = 1; pop[s.i] = 1; popping.add(s.i); write(s.i); dirty = true;
      }
      if (job.k >= job.cells.length) {
        ripple(job.cx * cell, job.cy * cell, 0.07);
        job = null; anchor = null;
      } else {
        const s = job.cells[job.k];
        const u = pos - k;
        colour[s.i] = s.c; progress[s.i] = u; write(s.i); dirty = true;
        threadMat.color.copy(s.c === 1 ? uniforms.uRed.value : uniforms.uBlack.value);
        // first leg: bottom left to top right; second: top left to bottom right
        const first = u < 0.5;
        legT = first ? u * 2 : u * 2 - 1;
        const a = first ? [0.13, 0.87] : [0.13, 0.13], b = first ? [0.87, 0.13] : [0.87, 0.87];
        const ax = (s.x + a[0]) * cell, ay = (s.y + a[1]) * cell, bx2 = (s.x + b[0]) * cell, by = (s.y + b[1]) * cell;
        const lift = Math.sin(Math.PI * legT);
        tipGoal.copy(toWorld(ax + (bx2 - ax) * legT, ay + (by - ay) * legT, 0.16 * lift - 0.035 * (1 - lift)));
        anchor = toWorld(ax, ay, 0);
      }
    } else if (pointer.seen && !parked && !calm()) {
      // resting: it follows the pointer a little above the cloth, like held in a hand
      tipGoal.copy(toWorld(pointer.x + 26, pointer.y + 30, 0.35 + 0.04 * Math.sin(t * 2.2)));
    } else {
      tipGoal.copy(toWorld(size.w * 0.86, size.h * 0.78, 0.4 + 0.04 * Math.sin(t * 1.7)));
    }
    tipNow.lerp(tipGoal, job ? 0.55 : 0.08);
    if (calm()) tipNow.copy(tipGoal);
    needle.position.copy(tipNow);
    const tilt = new Vector3(lean.x + Math.sin(t * 0.7) * 0.06, lean.y, lean.z).normalize();
    q.setFromUnitVectors(up, tilt);
    needle.quaternion.copy(q);
    const h = Math.max(0, tipNow.z);
    shadow.position.set(tipNow.x + h * 0.5 + tilt.x * 0.2, tipNow.y - h * 0.6 + tilt.y * 0.2, 0.06);
    shadow.material.opacity = Math.max(0.15, 1 - h * 1.6);

    // the thread: from the hole in the cloth, sagging, through the eye, and a short tail after it
    const eyePos = needle.localToWorld(new Vector3(0, TIP + L + R * 1.2, 0));
    const from = anchor || eyePos.clone().add(new Vector3(0.02, -0.35, -0.1));
    const mid = from.clone().lerp(eyePos, 0.5).add(new Vector3(0, -0.08, 0.06));
    const tail = eyePos.clone().add(new Vector3(0.1 + Math.sin(t * 1.3) * 0.03, -0.28, 0.05));
    thread.geometry.dispose?.();
    thread.geometry = new TubeGeometry(new CatmullRomCurve3([from, mid, eyePos, tail]), 28, R * 0.55, 5, false);
    if (!job && !anchor) threadMat.color.copy(uniforms.uRed.value);

    // a stitch just done swells and settles
    for (const i of popping) {
      pop[i] = Math.max(0, pop[i] - (calm() ? 1 : 0.05));
      if (!pop[i]) popping.delete(i);
      write(i); dirty = true;
    }
    if (dirty) tex.needsUpdate = true;

    // the pointer presses the cloth; moving it leaves ripples
    const press = uniforms.uPress.value;
    const active = pointer.seen && performance.now() - pointer.at < 1500 && !calm();
    const pw = toWorld(pointer.x, pointer.y);
    press.x += (pw.x - press.x) * 0.25; press.y += (pw.y - press.y) * 0.25;
    press.z += ((active ? 1 : 0) - press.z) * 0.06;
    if (active && t - lastRip > 0.16 && Math.hypot(pointer.x - lastX, pointer.y - lastY) > 40) {
      ripple(pointer.x, pointer.y, 0.022);
      lastRip = t; lastX = pointer.x; lastY = pointer.y;
    }
    // the camera drifts a little with the pointer, so the cloth reads as cloth
    camera.position.x = (active ? pointer.nx : 0) * 0.12 + Math.sin(t * 0.21) * 0.05;
    camera.position.y = (active ? pointer.ny : 0) * 0.08;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  st.loop(frame);
  return () => {
    darkWatch.disconnect();
    tex?.dispose();
    cloth.geometry.dispose(); cloth.material.dispose();
    thread.geometry.dispose?.(); threadMat.dispose(); needleMat.dispose();
    shadow.material.map.dispose(); shadow.material.dispose(); shadow.geometry.dispose();
    [tip, body, eye].forEach((m) => m.geometry.dispose());
    st.dispose();
  };
}
