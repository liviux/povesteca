// Radio cu lămpi: the front of an old valve radio under the menu, drawn in 3D.
// A walnut panel with the green "magic eye" on the left, a brass-framed glass dial in the middle with the
// valves glowing behind it, and the tuning knob on the right. Scrolling the page tunes the radio: the red
// needle runs along the dial and the magic eye closes when it reaches a city. While a story plays the
// valves glow brighter and little notes float up. A tap on an empty spot sends out radio waves; a tap on
// the knob tunes to the next city, a tap on the eye makes it blink. The radio makes no sound of its own.
// The space for it is kept free under the menu by themes/radio.css (--band); the rest of the page sits on top.
import {
  Scene, PerspectiveCamera, OrthographicCamera, Group, Mesh, Sprite, Points, Shape, Path, Vector2, Color,
  MeshStandardMaterial, MeshBasicMaterial, ShaderMaterial, SpriteMaterial, PointsMaterial,
  LatheGeometry, CylinderGeometry, BoxGeometry, PlaneGeometry, CircleGeometry, RingGeometry, ExtrudeGeometry, BufferGeometry, BufferAttribute,
  CanvasTexture, PMREMGenerator, AmbientLight, DirectionalLight, AdditiveBlending, DoubleSide, BackSide, RepeatWrapping, SRGBColorSpace,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeStage, calm, dark } from './stage.js';
import { state } from '../store.js';

const CITIES = ['București', 'Iași', 'Cluj', 'Craiova', 'Timișoara', 'Constanța'];
const FEW = ['București', 'Cluj', 'Iași', 'Constanța'];
const SCALE = ['55', '60', '70', '80', '100', '120', '140', '160'];
const cityAt = (i, n) => 0.08 + (i * 0.84) / (n - 1);

const playing = () => state.player.status === 'playing';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
const glowTex = () => canvasTex(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#fff'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});
// an eighth note and two beamed ones, drawn by hand (a font may not have ♪)
const noteTex = (pair) => canvasTex(64, 64, (g) => {
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round';
  const head = (x, y) => { g.save(); g.translate(x, y); g.rotate(-0.4); g.beginPath(); g.ellipse(0, 0, 9, 6.5, 0, 0, 7); g.fill(); g.restore(); };
  if (pair) {
    head(16, 50); head(46, 44);
    g.beginPath(); g.moveTo(24, 48); g.lineTo(24, 12); g.moveTo(54, 42); g.lineTo(54, 6); g.stroke();
    g.lineWidth = 8; g.beginPath(); g.moveTo(24, 14); g.lineTo(54, 8); g.stroke();
  } else {
    head(24, 48);
    g.beginPath(); g.moveTo(32, 46); g.lineTo(32, 8); g.stroke();
    g.beginPath(); g.moveTo(32, 8); g.quadraticCurveTo(50, 18, 46, 34); g.stroke();
  }
});
// walnut: dark grain lines on honey brown, as a tile the panel repeats
const woodTex = () => {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6b3f1f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      const y = Math.random() * h, a = Math.random() * 0.18;
      g.strokeStyle = Math.random() < 0.5 ? `rgba(40,18,6,${a + 0.05})` : `rgba(190,120,60,${a})`;
      g.lineWidth = 0.6 + Math.random() * 2.4;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 70 + i) * 3 + Math.sin(x / 23 + i * 3) * 1.2);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / 260, 1 / 260); // ExtrudeGeometry's UVs are in scene units
  return t;
};

// a rounded rectangle path centred on (cx, cy)
function rrect(p, cx, cy, w, h, r) {
  const x = cx - w / 2, y = cy - h / 2;
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

const GLASS_V = /* glsl */`
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = position.y;
    gl_Position = projectionMatrix * mv;
  }`;
// thin glass: bright at the edges, two vertical streaks of light, the silvery getter at the top, warm when hot
const GLASS_F = /* glsl */`
  uniform float uTop; uniform float uHeat;
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
    float s1 = smoothstep(0.45, 0.6, vN.x) * (1.0 - smoothstep(0.62, 0.8, vN.x));
    float s2 = smoothstep(-0.85, -0.75, vN.x) * (1.0 - smoothstep(-0.7, -0.6, vN.x));
    float getter = smoothstep(uTop * 0.8, uTop * 0.97, vY);
    vec3 col = vec3(0.85, 0.9, 1.0) * f * 0.7 + vec3(1.0) * (s1 * 0.7 + s2 * 0.35)
      + vec3(0.55, 0.58, 0.62) * getter + vec3(1.0, 0.5, 0.15) * uHeat * f * 0.6;
    float a = clamp(f * 0.6 + s1 * 0.55 + s2 * 0.3 + getter * 0.85, 0.0, 1.0);
    gl_FragColor = vec4(col, a);
  }`;
// the air shimmering over a hot valve
const HAZE_F = /* glsl */`
  uniform float uTime; uniform float uHeat; varying vec2 vUv;
  void main() {
    float w = sin(vUv.y * 18.0 - uTime * 5.0 + sin(vUv.x * 9.0 + uTime * 2.0) * 2.0);
    float s = smoothstep(0.6, 1.0, w) * (1.0 - abs(vUv.x - 0.5) * 2.0) * (1.0 - vUv.y) * vUv.y * 4.0;
    gl_FragColor = vec4(vec3(1.0, 0.7, 0.4), s * 0.16 * uHeat);
  }`;
// the magic eye: a green phosphor fan with a dark wedge at the top that narrows when a station is tuned
const EYE_F = /* glsl */`
  uniform float uOpen; uniform float uGlow; uniform float uTime; varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0; float r = length(p); float a = atan(p.x, p.y);
    float phos = smoothstep(0.26, 0.34, r) * (1.0 - smoothstep(0.9, 0.98, r));
    float vane = 0.8 + 0.2 * sin(a * 34.0);
    float wedge = smoothstep(uOpen * 0.5, uOpen * 0.5 + 0.07, abs(a));
    float bright = mix(0.45, 1.0, smoothstep(0.3, 0.95, r)) * (0.94 + 0.06 * sin(uTime * 3.0));
    vec3 col = vec3(0.2, 1.0, 0.48) * phos * wedge * vane * bright * uGlow;
    col += vec3(0.05, 0.25, 0.1) * phos * (1.0 - wedge) * 0.35;
    float cap = 1.0 - smoothstep(0.22, 0.27, r);
    col = mix(col, vec3(0.16, 0.15, 0.14) + 0.35 * smoothstep(0.14, 0.0, length(p - vec2(-0.06, 0.08))), cap);
    col += 0.55 * smoothstep(0.22, 0.0, length(p - vec2(-0.42, 0.5)));
    gl_FragColor = vec4(col + vec3(0.01, 0.03, 0.02), 1.0);
  }`;
const UV_V = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// the dial's glass: frequencies on top, cities at the bottom, lit amber from behind
function drawDial(g, w, h, cities, tuned) {
  g.clearRect(0, 0, w, h);
  const tint = g.createLinearGradient(0, 0, 0, h);
  tint.addColorStop(0, 'rgba(255,176,80,.22)'); tint.addColorStop(0.35, 'rgba(255,150,60,.05)');
  tint.addColorStop(0.65, 'rgba(255,150,60,.05)'); tint.addColorStop(1, 'rgba(255,176,80,.24)');
  g.fillStyle = tint; g.fillRect(0, 0, w, h);
  const pad = h * 0.1, y1 = h * 0.3, y2 = h * 0.7;
  const glow = (blur, c = 'rgba(255,150,40,.9)') => { g.shadowColor = c; g.shadowBlur = blur; };
  g.strokeStyle = 'rgba(255,226,170,.85)'; g.fillStyle = '#ffe3a8'; g.lineWidth = Math.max(1, h * 0.012);
  glow(h * 0.06);
  g.beginPath(); g.moveTo(pad, y1); g.lineTo(w - pad, y1); g.moveTo(pad, y2); g.lineTo(w - pad, y2); g.stroke();
  const ticks = 70;
  g.beginPath();
  for (let i = 0; i <= ticks; i++) {
    const x = pad + (i / ticks) * (w - 2 * pad), len = i % 10 === 0 ? h * 0.1 : i % 5 === 0 ? h * 0.07 : h * 0.04;
    g.moveTo(x, y1); g.lineTo(x, y1 - len);
  }
  g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `600 ${Math.round(h * 0.13)}px Oswald, 'Arial Narrow', sans-serif`;
  SCALE.forEach((s, i) => g.fillText(s, pad + (i / (SCALE.length - 1)) * (w - 2 * pad), y1 - h * 0.12));
  // the cities, smaller until they don't touch
  let fs = h * 0.145;
  const xs = cities.map((_, i) => pad + cityAt(i, cities.length) * (w - 2 * pad));
  for (; fs > 7; fs *= 0.92) {
    g.font = `600 ${fs}px Oswald, 'Arial Narrow', sans-serif`;
    const ws = cities.map((c) => g.measureText(c.toUpperCase()).width);
    if (xs.every((x, i) => !i || x - xs[i - 1] > (ws[i] + ws[i - 1]) / 2 + fs * 0.6)) break;
  }
  cities.forEach((c, i) => {
    const on = i === tuned;
    g.font = `600 ${fs * (on ? 1.08 : 1)}px Oswald, 'Arial Narrow', sans-serif`;
    const half = g.measureText(c.toUpperCase()).width / 2;
    const x = Math.min(w - pad - half, Math.max(pad + half, xs[i]));
    glow(on ? h * 0.2 : h * 0.06, on ? 'rgba(255,200,90,1)' : undefined);
    g.fillStyle = on ? '#fffaf0' : '#ffd48a';
    g.fillText(c.toUpperCase(), x, y2 + fs * 1.25);
    g.beginPath(); g.moveTo(xs[i], y2 - h * 0.05); g.lineTo(xs[i] + h * 0.035, y2); g.lineTo(xs[i], y2 + h * 0.05); g.lineTo(xs[i] - h * 0.035, y2); g.fill();
  });
  g.shadowBlur = 0;
  // a reflection across the glass
  const ref = g.createLinearGradient(0, 0, w, h);
  ref.addColorStop(0.3, 'rgba(255,255,255,0)'); ref.addColorStop(0.42, 'rgba(255,255,255,.07)'); ref.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = ref; g.fillRect(0, 0, w, h);
}

export function start() {
  const root = document.documentElement;
  const stage = makeStage();
  if (!stage) return () => {};
  root.setAttribute('data-radio-live', '');
  const { renderer, size, pointer } = stage;
  renderer.autoClear = false;

  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const glow = glowTex(), notes = [noteTex(false), noteTex(true)], wood = woodTex();
  const keep = [glow, ...notes, wood, env]; // textures to free at the end

  // ---------- the radio's front, drawn in the band under the menu ----------
  const band = new Scene();
  band.environment = env;
  band.add(new AmbientLight(0xfff0dd, 0.6));
  const key = new DirectionalLight(0xfff3e0, 1.6);
  key.position.set(-0.4, 1, 1.2);
  band.add(key);
  // a narrow lens from far away: the band is very wide, and a wide lens would stretch the eye and the knob at its ends
  const FOV = 6;
  const cam = new PerspectiveCamera(FOV, 1, 1, 1e5);
  const part = new Group(); // rebuilt when the band changes size
  band.add(part);

  const mat = {
    walnut: new MeshStandardMaterial({ map: wood, roughness: 0.42, metalness: 0.05, envMapIntensity: 0.35 }),
    brass: new MeshStandardMaterial({ color: 0xd4a94e, metalness: 1, roughness: 0.26 }),
    bakelite: new MeshStandardMaterial({ color: 0x1a120c, roughness: 0.35, metalness: 0.1 }),
    knob: new MeshStandardMaterial({ color: 0x3b2112, roughness: 0.3, metalness: 0.1 }),
    chassis: new MeshStandardMaterial({ color: 0x1c120b, roughness: 0.6, metalness: 0.4, envMapIntensity: 0.25 }),
    plate: new MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.45, metalness: 0.8 }),
    mica: new MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.8, transparent: true, opacity: 0.6 }),
    rod: new MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.3, metalness: 1 }),
    cream: new MeshBasicMaterial({ color: 0xfff1d6 }),
  };

  let built = { w: 0, h: 0 }, tubes = [], eye, knob, needle, dial, dialCtx, cities = CITIES, holeX = 0, holeW = 1, holeH = 1, D = 1, tuned = -1;
  const sceneOf = { eye: null, knob: null }; // where eye and knob are, in band pixels from the band's left top

  function freeGroup(g) {
    g.traverse((o) => {
      o.geometry?.dispose();
      if (o.material && !Object.values(mat).includes(o.material)) { o.material.map && !keep.includes(o.material.map) && o.material.map.dispose(); o.material.dispose(); }
    });
    g.clear();
  }

  function build(W, H) {
    freeGroup(part);
    built = { w: W, h: H };
    D = H / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
    cam.aspect = W / H; cam.position.set(0, 0, D); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    const narrow = W < 520;
    cities = narrow ? FEW : CITIES;
    const frame = H * 0.09, sideL = narrow ? H * 0.9 : H * 1.05, sideR = narrow ? frame : H * 1.05;
    holeW = W - sideL - sideR; holeX = (sideL - sideR) / 2;
    holeH = H - 2 * frame;
    const rr = Math.min(holeH * 0.22, 14);

    // walnut face with a window for the dial (square outside: the corners of the band stay filled)
    const face = new Shape(); face.moveTo(-W / 2 - 4, -H / 2 - 4); face.lineTo(W / 2 + 4, -H / 2 - 4); face.lineTo(W / 2 + 4, H / 2 + 4); face.lineTo(-W / 2 - 4, H / 2 + 4); face.closePath();
    face.holes.push(rrect(new Path(), holeX, 0, holeW, holeH, rr));
    const faceM = new Mesh(new ExtrudeGeometry(face, { depth: frame * 0.5, bevelEnabled: true, bevelThickness: frame * 0.35, bevelSize: frame * 0.3, bevelSegments: 4, curveSegments: 10 }), mat.walnut);
    faceM.position.z = -frame * 0.6;
    part.add(faceM);
    // the brass ring around the window
    const ring = rrect(new Shape(), holeX, 0, holeW + frame * 0.7, holeH + frame * 0.7, rr + frame * 0.35);
    ring.holes.push(rrect(new Path(), holeX, 0, holeW - frame * 0.15, holeH - frame * 0.15, rr));
    const ringM = new Mesh(new ExtrudeGeometry(ring, { depth: frame * 0.2, bevelEnabled: true, bevelThickness: frame * 0.18, bevelSize: frame * 0.12, bevelSegments: 3, curveSegments: 10 }), mat.brass);
    ringM.position.z = frame * 0.1;
    part.add(ringM);

    // inside: the chassis, then the valves, then the glass with the scale
    const back = -H * 1.1, grow = (D - back) / D;
    const chassis = new Mesh(new PlaneGeometry(holeW * grow * 1.1, holeH * grow * 1.1), mat.chassis);
    chassis.position.set(holeX * grow, 0, back);
    part.add(chassis);
    const deck = new Mesh(new BoxGeometry(holeW * 1.05, H * 0.06, H * 0.9), mat.chassis);
    deck.position.set(holeX, -H * 0.43, -H * 0.6);
    part.add(deck);

    tubes = [];
    const tz = -H * 0.5, ts = D / (D - tz); // valves stand back a little: they look smaller
    const n = Math.max(3, Math.min(9, Math.round(holeW / (H * 0.62))));
    for (let i = 0; i < n; i++) {
      const big = i === 0 || (n > 5 && i === n - 1); // the rectifier and the output valve are bigger
      const r = H * (big ? 0.15 : 0.115) * (0.92 + Math.random() * 0.14), h = H * (big ? 0.95 : 0.78) * (0.92 + Math.random() * 0.1);
      const g = new Group();
      const x = ((holeX - holeW / 2 + (holeW * (i + 0.5)) / n) / ts) * 0.98;
      g.position.set(x, -H * 0.43 / ts + H * 0.03, tz);
      const base = new Mesh(new CylinderGeometry(r * 1.06, r * 1.12, h * 0.14, 32), mat.bakelite);
      base.position.y = h * 0.07; g.add(base);
      const pts = [new Vector2(r * 0.96, h * 0.13), new Vector2(r, h * 0.2), new Vector2(r, h * 0.78)];
      for (let k = 1; k <= 10; k++) { const a = (k / 10) * (Math.PI / 2) * 0.92; pts.push(new Vector2(r * Math.cos(a), h * 0.78 + r * 0.95 * Math.sin(a))); }
      pts.push(new Vector2(r * 0.12, h * 0.78 + r * 1.08), new Vector2(0.001, h * 0.78 + r * 1.2));
      const glassMat = new ShaderMaterial({ vertexShader: GLASS_V, fragmentShader: GLASS_F, transparent: true, depthWrite: false, uniforms: { uTop: { value: h * 0.78 + r }, uHeat: { value: 0 } } });
      const inner = new Mesh(new LatheGeometry(pts, 40), glassMat.clone()); inner.material.side = BackSide; inner.material.uniforms.uTop.value = h * 0.78 + r; inner.renderOrder = 2; g.add(inner);
      const glass = new Mesh(inner.geometry, glassMat); glass.renderOrder = 3; g.add(glass);
      const plate = new Mesh(new BoxGeometry(r * 1.2, h * 0.4, r * 0.55), mat.plate); plate.position.y = h * 0.47; g.add(plate);
      const slit = new Mesh(new PlaneGeometry(r * 0.16, h * 0.34), new MeshBasicMaterial({ color: 0xff7a2a, toneMapped: false }));
      slit.position.set(0, h * 0.47, r * 0.28); g.add(slit);
      for (const y of [h * 0.25, h * 0.69]) { const m = new Mesh(new CylinderGeometry(r * 0.9, r * 0.9, h * 0.012, 28), mat.mica); m.position.y = y; g.add(m); }
      for (const sx of [-0.55, 0.55]) { const rod = new Mesh(new CylinderGeometry(r * 0.04, r * 0.04, h * 0.6, 6), mat.rod); rod.position.set(sx * r, h * 0.48, 0); g.add(rod); }
      const halo = new Sprite(new SpriteMaterial({ map: glow, color: 0xff8a3a, blending: AdditiveBlending, depthWrite: false, transparent: true }));
      halo.position.set(0, h * 0.47, r * 0.7); halo.renderOrder = 4; g.add(halo);
      const pool = new Sprite(new SpriteMaterial({ map: glow, color: 0xff7a30, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
      pool.position.set(0, h * 0.5, back - tz + 2); pool.scale.setScalar(H * 2.2); g.add(pool);
      const haze = new Mesh(new PlaneGeometry(r * 2.4, h * 0.7), new ShaderMaterial({ vertexShader: UV_V, fragmentShader: HAZE_F, transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uTime: { value: 0 }, uHeat: { value: 0 } } }));
      haze.position.set(0, h * 0.78 + r + h * 0.35, r); haze.renderOrder = 5; g.add(haze);
      part.add(g);
      tubes.push({ g, r, h, glass: [glassMat, inner.material], slit, halo, pool, haze, heat: 0, warm: 0, seed: Math.random() * 100, sx: 0 });
    }
    tubes.forEach((t) => { t.sx = W / 2 + t.g.position.x * ts; }); // where each valve is on screen, in band pixels

    // the glass and its printed scale
    const dw = Math.round((holeW - 4) * Math.min(devicePixelRatio || 1, 2)), dh = Math.round((holeH - 4) * Math.min(devicePixelRatio || 1, 2));
    const dc = document.createElement('canvas'); dc.width = dw; dc.height = dh; dialCtx = dc.getContext('2d');
    const dt = new CanvasTexture(dc); dt.colorSpace = SRGBColorSpace;
    tuned = -1; drawDial(dialCtx, dw, dh, cities, tuned); dt.needsUpdate = true;
    dial = new Mesh(new PlaneGeometry(holeW - 4, holeH - 4), new MeshBasicMaterial({ map: dt, transparent: true, depthWrite: false, toneMapped: false }));
    dial.position.set(holeX, 0, -2); dial.renderOrder = 6; part.add(dial);
    dial.userData = { dw, dh, tex: dt };

    // the red needle
    needle = new Group();
    const nl = new Mesh(new PlaneGeometry(Math.max(2, H * 0.022), holeH * 0.86), new MeshBasicMaterial({ color: 0xe8321c, toneMapped: false }));
    const ng = new Mesh(new PlaneGeometry(H * 0.12, holeH * 0.9), new MeshBasicMaterial({ map: glow, color: 0xff4a20, transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false }));
    nl.renderOrder = 8; ng.renderOrder = 7;
    needle.add(ng, nl); needle.position.z = -1; part.add(needle);

    // the magic eye, set in black bakelite and a brass ring
    const R = Math.min(sideL * 0.34, H * 0.3);
    eye = new Group(); eye.position.set(-W / 2 + sideL / 2, 0, frame * 0.3 + R * 0.05);
    const disc = new Mesh(new CircleGeometry(R, 64), new ShaderMaterial({ vertexShader: UV_V, fragmentShader: EYE_F, uniforms: { uOpen: { value: 1.2 }, uGlow: { value: 1 }, uTime: { value: 0 } } }));
    const bez = new Mesh(new CylinderGeometry(R * 1.32, R * 1.4, R * 0.5, 48, 1, true), mat.bakelite); bez.rotation.x = Math.PI / 2;
    const lip = new Mesh(new RingGeometry(R * 0.98, R * 1.34, 48), mat.bakelite); lip.position.z = R * 0.25;
    const brass = new Mesh(new RingGeometry(R * 1.34, R * 1.5, 48), mat.brass); brass.position.z = R * 0.2;
    eye.add(disc, bez, lip, brass); part.add(eye);
    eye.userData.disc = disc;
    sceneOf.eye = { x: sideL / 2, y: H / 2, r: R * 1.5 };

    // the tuning knob, ridged all round, with a brass cap and a white mark
    knob = null; sceneOf.knob = null;
    if (!narrow) {
      const K = Math.min(sideR * 0.34, H * 0.3);
      knob = new Group(); knob.position.set(W / 2 - sideR / 2, 0, K * 0.4);
      const body = new Mesh(new CylinderGeometry(K, K * 1.08, K * 0.8, 48), mat.knob); body.rotation.x = Math.PI / 2; knob.add(body);
      for (let k = 0; k < 30; k++) {
        const a = (k / 30) * Math.PI * 2, rid = new Mesh(new BoxGeometry(K * 0.1, K * 0.14, K * 0.78), mat.knob);
        rid.position.set(Math.cos(a) * K * 1.02, Math.sin(a) * K * 1.02, 0); rid.rotation.z = a; knob.add(rid);
      }
      const cap = new Mesh(new CylinderGeometry(K * 0.72, K * 0.72, K * 0.1, 48), mat.brass); cap.rotation.x = Math.PI / 2; cap.position.z = K * 0.42; knob.add(cap);
      const mark = new Mesh(new BoxGeometry(K * 0.12, K * 0.55, K * 0.05), mat.cream); mark.position.set(0, K * 0.6, K * 0.42); knob.add(mark);
      part.add(knob);
      sceneOf.knob = { x: W - sideR / 2, y: H / 2, r: K * 1.4 };
    }
  }

  // ---------- waves, sparks and notes over the whole page (behind the text) ----------
  const over = new Scene();
  const ocam = new OrthographicCamera(0, 1, 0, -1, -10, 10);
  stage.onResize(({ w, h }) => { ocam.right = w; ocam.bottom = -h; ocam.updateProjectionMatrix(); });
  const rings = Array.from({ length: 14 }, () => {
    const m = new Mesh(new RingGeometry(0.92, 1, 72), new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide, opacity: 0 }));
    m.visible = false; m.userData = { t: 1, life: 1, max: 100 }; over.add(m); return m;
  });
  const NS = 360;
  const sp = { pos: new Float32Array(NS * 3), vel: new Float32Array(NS * 2), life: new Float32Array(NS), next: 0 };
  const sparkGeo = new BufferGeometry(); sparkGeo.setAttribute('position', new BufferAttribute(sp.pos, 3));
  const sparks = new Points(sparkGeo, new PointsMaterial({ map: glow, size: 9, transparent: true, depthWrite: false, sizeAttenuation: false, opacity: 0.95 }));
  sparks.frustumCulled = false; over.add(sparks);
  sp.pos.fill(-9999);
  const floating = Array.from({ length: 26 }, (_, i) => {
    const s = new Sprite(new SpriteMaterial({ map: notes[i % 2], transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false; s.userData = { life: 0 }; over.add(s); return s;
  });
  // notes rising out of the valves, inside the radio
  const inside = Array.from({ length: 10 }, (_, i) => {
    const s = new Sprite(new SpriteMaterial({ map: notes[i % 2], color: 0xffd48a, transparent: true, depthWrite: false, opacity: 0, blending: AdditiveBlending }));
    s.visible = false; s.renderOrder = 5; s.userData = { life: 0 }; band.add(s); return s;
  });

  const ink = () => (dark() ? new Color(0xffb347) : new Color(0x8a2a12));
  function wave(x, y, max = 160, count = 3) {
    for (let k = 0; k < count; k++) {
      const m = rings.find((r) => !r.visible) || rings[0];
      m.visible = true; m.position.set(x, -y, 0); m.userData = { t: -k * 0.16, life: 1.3, max: max * (1 + k * 0.25) };
      m.material.color = ink();
    }
  }
  function burst(x, y, n = 36) {
    for (let k = 0; k < n; k++) {
      const i = sp.next = (sp.next + 1) % NS, a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 260;
      sp.pos[i * 3] = x; sp.pos[i * 3 + 1] = -y; sp.vel[i * 2] = Math.cos(a) * v; sp.vel[i * 2 + 1] = Math.sin(a) * v + 80; sp.life[i] = 0.7 + Math.random() * 0.7;
    }
  }

  // ---------- state ----------
  const startedAt = performance.now() / 1000;
  let bandRect = null, bandH = 0, bandGap = 14, last = 0, needleP = 0.08, knobOff = 0, blink = 0, eyeOpen = 1.2, noteClock = 0, tuneClock = 0;
  const readBand = () => {
    const cs = getComputedStyle(root);
    bandH = parseFloat(cs.getPropertyValue('--band')) || 0;
    bandGap = parseFloat(cs.getPropertyValue('--band-gap')) || 14;
  };
  readBand();
  stage.onResize(readBand);
  function measure() {
    const head = document.querySelector('.site-head'), inner = head?.querySelector('.head-inner');
    if (!inner || !bandH) return null;
    const r = inner.getBoundingClientRect(), hr = head.getBoundingClientRect(), cs = getComputedStyle(inner);
    const x = r.left + parseFloat(cs.paddingLeft), w = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return { x: Math.round(x), y: Math.round(hr.bottom + 7 + bandGap), w: Math.round(w), h: Math.round(bandH) }; // 7: the brass strip under the menu
  }
  // the needle crosses the whole dial while the radio scrolls out of sight, so the tuning is always seen
  const scrollP = () => (bandRect ? Math.min(1, Math.max(0, scrollY / Math.max(1, bandRect.y + bandRect.h + scrollY))) : 0);
  const target = () => ((0.06 + scrollP() * 0.88 + knobOff) % 1 + 1) % 1;

  stage.onTap((x, y) => {
    const b = bandRect;
    if (b && sceneOf.knob && Math.hypot(x - b.x - sceneOf.knob.x, y - b.y - sceneOf.knob.y) < sceneOf.knob.r) {
      // the knob: on to the next city
      const now = target(), n = cities.length;
      let next = 0;
      for (let i = 0; i < n; i++) if (cityAt(i, n) > now + 0.015) { next = cityAt(i, n); break; }
      if (!next) next = cityAt(0, n) + 1;
      knobOff += next - now;
      burst(x, y, 14);
    } else if (b && sceneOf.eye && Math.hypot(x - b.x - sceneOf.eye.x, y - b.y - sceneOf.eye.y) < sceneOf.eye.r) {
      blink = 1;
      burst(x, y, 18);
    } else {
      wave(x, y, 150 + Math.random() * 60);
      burst(x, y);
    }
    if (calm()) frame(performance.now() / 1000);
  });

  function frame(t) {
    const still = calm();
    const dt = still ? 0 : Math.min(0.05, Math.max(0, t - last));
    last = t;
    const night = dark();
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.w, size.h);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();

    const b = (bandRect = measure());
    if (b && b.w > 120 && b.h > 30 && (b.w !== built.w || b.h !== built.h)) build(b.w, b.h);
    const on = playing();

    // tuning: the page's scroll moves the needle, the knob adds its own turns
    const goal = target();
    needleP = still || Math.abs(goal - needleP) > 0.6 ? goal : needleP + (goal - needleP) * Math.min(1, dt * 5);
    const n = cities.length;
    let near = 1, idx = -1;
    for (let i = 0; i < n; i++) { const d = Math.abs(needleP - cityAt(i, n)); if (d < near) { near = d; idx = i; } }
    const now = near < 0.018 ? idx : -1;
    if (built.w && now !== tuned) {
      tuned = now;
      drawDial(dialCtx, dial.userData.dw, dial.userData.dh, cities, tuned);
      dial.userData.tex.needsUpdate = true;
      if (tuned >= 0 && b && !still && needle && last > 1 && t - startedAt > 1) wave(b.x + built.w / 2 + needle.position.x, b.y + built.h / 2, 60, 2);
    }
    blink = Math.max(0, blink - dt * 2.2);
    const open = 0.1 + Math.min(1, near / 0.09) * 1.25;
    eyeOpen = still ? open : eyeOpen + (open - eyeOpen) * Math.min(1, dt * 7);

    if (built.w) {
      const H = built.h, pad = (holeH - 4) * 0.1; // the scale's margin, as drawn in drawDial
      needle.position.x = holeX - (holeW - 4) / 2 + pad + needleP * (holeW - 4 - 2 * pad);
      const ed = eye.userData.disc.material.uniforms;
      ed.uOpen.value = Math.max(0.04, eyeOpen * (1 - Math.sin(blink * Math.PI)) + (still ? 0 : Math.sin(t * 7.3) * 0.03));
      ed.uGlow.value = (night ? 1.1 : 0.95) * (on ? 1.15 : 1); ed.uTime.value = t;
      if (knob) knob.rotation.z = -needleP * Math.PI * 6;
      band.environmentIntensity = night ? 0.45 : 0.9;

      // the valves: a slow flicker, brighter while a story plays, warmer near the pointer
      const px = b ? pointer.x - b.x : -1e4, py = b ? pointer.y - b.y : -1e4;
      for (const tb of tubes) {
        const dist = Math.hypot((px - tb.sx) / (H * 0.8), Math.max(0, Math.abs(py - H / 2) - H / 2) / (H * 1.5));
        const want = pointer.seen && !still ? Math.max(0, 1 - dist) : 0;
        tb.warm += (want - tb.warm) * Math.min(1, dt * 4);
        const flick = still ? 1 : 0.9 + 0.06 * Math.sin(t * 13 + tb.seed) + 0.04 * Math.sin(t * 37.7 + tb.seed * 3);
        const heat = ((on ? 1.25 : 0.8) + tb.warm * 0.7) * flick;
        tb.heat = heat;
        const c = new Color().setRGB(1, 0.42 + tb.warm * 0.35, 0.12 + tb.warm * 0.25);
        tb.slit.material.color.copy(c).multiplyScalar(0.7 + heat * 0.6);
        tb.halo.material.color.copy(c); tb.halo.material.opacity = Math.min(1, 0.35 + heat * 0.45);
        tb.halo.scale.setScalar(tb.r * (3.6 + heat * 2.2));
        tb.pool.material.opacity = 0.1 + heat * 0.16;
        tb.glass.forEach((m) => { m.uniforms.uHeat.value = heat * 0.6; });
        tb.haze.material.uniforms.uHeat.value = heat; tb.haze.material.uniforms.uTime.value = t + tb.seed;
      }

      // notes out of the valves while a story plays
      if (on && !still) {
        noteClock -= dt;
        if (noteClock <= 0 && tubes.length) {
          noteClock = 0.5 + Math.random() * 0.6;
          const s = inside.find((x) => !x.visible), tb = tubes[(Math.random() * tubes.length) | 0];
          if (s) { s.visible = true; s.userData = { life: 0, x: tb.g.position.x, y: tb.g.position.y + tb.h, z: tb.g.position.z + tb.r * 2, sway: Math.random() * 6 }; }
        }
      }
      for (const s of inside) {
        if (!s.visible) continue;
        const u = s.userData; u.life += dt / 2.4;
        if (u.life >= 1) { s.visible = false; continue; }
        s.position.set(u.x + Math.sin(u.life * 6 + u.sway) * H * 0.06, u.y + u.life * H * 0.5, u.z);
        s.scale.setScalar(H * 0.16 * (0.6 + u.life * 0.6));
        s.material.opacity = Math.sin(u.life * Math.PI) * 0.9;
      }
    }

    if (b && built.w && b.y + b.h > 0 && b.y < size.h) {
      renderer.setScissorTest(true);
      const gy = size.h - (b.y + b.h);
      renderer.setViewport(b.x, gy, b.w, b.h); renderer.setScissor(b.x, gy, b.w, b.h);
      renderer.setClearColor(0x160d07, 1); renderer.clear();
      renderer.render(band, cam);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, size.w, size.h);
    }

    // over the page: waves, sparks, notes rising from the player while it plays
    for (const m of rings) {
      if (!m.visible) continue;
      const u = m.userData; u.t += dt / u.life;
      if (u.t >= 1) { m.visible = false; continue; }
      const k = Math.max(0, u.t);
      m.scale.setScalar(8 + k * u.max);
      m.material.opacity = u.t < 0 ? 0 : (1 - k) * (night ? 0.7 : 0.5);
    }
    sparks.material.color = night ? new Color(0xffcf7a) : new Color(0xc2561d);
    for (let i = 0; i < NS; i++) {
      if (sp.life[i] <= 0) { sp.pos[i * 3 + 1] = 9999; continue; }
      sp.life[i] -= dt;
      sp.vel[i * 2 + 1] -= 420 * dt;
      sp.pos[i * 3] += sp.vel[i * 2] * dt; sp.pos[i * 3 + 1] += sp.vel[i * 2 + 1] * dt;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    if (on && !still) {
      tuneClock -= dt;
      const bar = document.querySelector('.dock.open .dock-bar')?.getBoundingClientRect();
      if (tuneClock <= 0 && bar) {
        tuneClock = 0.45 + Math.random() * 0.5;
        const s = floating.find((x) => !x.visible);
        if (s) {
          s.visible = true;
          const palette = night ? [0xffb347, 0xffe3a8, 0xff8a5c] : [0x8a2a12, 0x6b4a1e, 0xb0471c];
          s.material.color = new Color(palette[(Math.random() * 3) | 0]);
          s.userData = { life: 0, x: bar.left + 40 + Math.random() * Math.max(10, bar.width - 80), y: bar.top - 6, sway: Math.random() * 6, rise: 180 + Math.random() * 220, spin: (Math.random() - 0.5) * 0.8, size: 22 + Math.random() * 16 };
        }
      }
    }
    for (const s of floating) {
      if (!s.visible) continue;
      const u = s.userData; u.life += dt / 4;
      if (u.life >= 1 || still) { s.visible = false; continue; }
      s.position.set(u.x + Math.sin(u.life * 7 + u.sway) * 22, -(u.y - u.life * u.rise), 0);
      s.material.rotation = Math.sin(u.life * 5 + u.sway) * 0.4 + u.spin;
      s.scale.setScalar(u.size);
      s.material.opacity = Math.sin(u.life * Math.PI) * (night ? 0.85 : 0.7);
    }
    renderer.render(over, ocam);
  }

  stage.loop(frame);
  // standing still ("reduce motion"): the needle still follows the scroll, one picture at a time
  const once = () => calm() && frame(performance.now() / 1000);
  stage.on(window, 'scroll', once, { passive: true });
  stage.on(window, 'resize', once);
  document.fonts?.load(`600 16px Oswald`).then(() => { tuned = -2; once(); }, () => {});

  return () => {
    root.removeAttribute('data-radio-live');
    freeGroup(part); freeGroup(band); freeGroup(over);
    Object.values(mat).forEach((m) => m.dispose());
    keep.forEach((t) => t.dispose());
    pmrem.dispose();
    stage.dispose();
  };
}
