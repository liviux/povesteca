// Teatru de umbre: a paper screen lit from behind by an oil lamp, and cut-out puppets on rods between them.
// Every puppet is drawn into its own small picture (its "mask"), which is then laid on the screen as a shadow:
// the farther a puppet is from the screen (nearer the lamp), the bigger, softer and paler its shadow, and the
// more it slides when the lamp moves. The lamp follows the pointer. Two shadows over each other darken like
// real ones (the light is multiplied), and the coloured parts (the dragon's wings, the prince's cape) let
// coloured light through, like the translucent leather of old shadow puppets.
// A tap on an empty spot: the nearest puppet jumps, or a new bird flies off from there.
import {
  Scene, OrthographicCamera, Mesh, Group, PlaneGeometry, ShapeGeometry, Shape, Path, Vector2, Color,
  MeshBasicMaterial, ShaderMaterial, WebGLRenderTarget, BufferGeometry, Float32BufferAttribute, DoubleSide,
  CustomBlending, AddEquation, ZeroFactor, OneFactor, OneMinusSrcColorFactor, LinearFilter, LinearMipmapLinearFilter,
} from 'three';
import { makeStage, calm } from './stage.js';
import { state } from '../store.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- cut-out shapes ----------
// an outline from [x, y] points, rounded by cutting corners twice; a third item (1) keeps that corner sharp
function smooth(pts, n = 2) {
  for (let k = 0; k < n; k++) {
    pts = pts.flatMap((p, i) => {
      if (p[2]) return [p];
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
      return [[p[0] * 0.75 + a[0] * 0.25, p[1] * 0.75 + a[1] * 0.25], [p[0] * 0.75 + b[0] * 0.25, p[1] * 0.75 + b[1] * 0.25]];
    });
  }
  return pts;
}
const hole = (cx, cy, rx, ry = rx) => { const p = new Path(); p.absellipse(cx, cy, rx, ry, 0, TAU, true); return p; };
const holeOf = (pts) => new Path(pts.map(([x, y]) => new Vector2(x, y)));
function outline(pts, holes = [], sharp = false) {
  const s = new Shape((sharp ? pts : smooth(pts)).map(([x, y]) => new Vector2(x, y)));
  s.holes.push(...holes);
  return s;
}
function oval(cx, cy, rx, ry = rx, holes = []) {
  const s = new Shape();
  s.absellipse(cx, cy, rx, ry, 0, TAU, false);
  s.holes.push(...holes);
  return s;
}
// what a mask is made of: INK blocks all the light, a tint lets some colour through (values = light blocked)
const INK = new MeshBasicMaterial({ color: 0xffffff, side: DoubleSide });
const tint = (r, g, b) => new MeshBasicMaterial({ color: new Color(r, g, b), side: DoubleSide });
const RED = tint(0.18, 0.78, 0.86), TEAL = tint(0.8, 0.32, 0.4), GOLD = tint(0.12, 0.3, 0.8);
const ROD = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });
const part = (shape, x = 0, y = 0, mat = INK, order = 1) => {
  const m = new Mesh(new ShapeGeometry(shape, 8), mat);
  m.position.set(x, y, 0);
  m.renderOrder = order;
  return m;
};
// a joint: children turn around (x, y) of their parent
function joint(parent, x, y, ...kids) {
  const g = new Group();
  g.position.set(x, y, 0);
  kids.forEach((k) => g.add(k));
  parent.add(g);
  return g;
}
// a thin stick from (x0, y0) to (x1, y1), solid near the puppet and fading where the hand would be
function rod(x0, y0, x1, y1, w = 2.4) {
  const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, ox = (nx / l) * w / 2, oy = (ny / l) * w / 2;
  const mx = x0 + (x1 - x0) * 0.5, my = y0 + (y1 - y0) * 0.5;
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute([
    x0 - ox, y0 - oy, 0, x0 + ox, y0 + oy, 0, mx + ox, my + oy, 0, mx - ox, my - oy, 0, x1 + ox, y1 + oy, 0, x1 - ox, y1 - oy, 0,
  ], 3));
  g.setAttribute('color', new Float32BufferAttribute([1, 1, 1, 1, 1, 1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0, 0, 0, 0, 0, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 4, 3, 4, 5]);
  return new Mesh(g, ROD);
}
const bar = (x0, y0, x1, y1, w = 3) => {
  const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, ox = (nx / l) * w / 2, oy = (ny / l) * w / 2;
  return outline([[x0 - ox, y0 - oy], [x0 + ox, y0 + oy], [x1 + ox, y1 + oy], [x1 - ox, y1 - oy]], [], true);
};

// ---------- the shadow of one puppet ----------
const PLANE = new PlaneGeometry(1, 1);
const MULTIPLY = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: ZeroFactor, blendDst: OneMinusSrcColorFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor };
const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// soft edges: the mask is read at 13 points of a disc as wide as the shadow's blur (and from a smaller copy
// of it when the blur is big, so the soft shadow stays smooth)
const SHADOW = `
varying vec2 vUv;
uniform sampler2D uMask; uniform vec2 uR; uniform float uLod, uDark;
const vec2 P[12] = vec2[12](vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
  vec2(0.962, -0.195), vec2(0.473, -0.480), vec2(0.519, 0.767), vec2(0.185, -0.893), vec2(0.507, 0.064),
  vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598));
void main() {
  vec3 m = textureLod(uMask, vUv, uLod).rgb;
  for (int i = 0; i < 12; i++) m += textureLod(uMask, vUv + P[i] * uR, uLod).rgb;
  gl_FragColor = vec4(m / 13.0 * uDark, 1.0);
}`;
const RES = 1.5; // mask pixels per puppet unit

class Puppet {
  // bounds: [x0, y0, x1, y1] around the puppet's own origin (its feet, or its middle when it flies)
  constructor(bounds, build) {
    this.scene = new Scene();
    this.root = new Group();
    this.scene.add(this.root);
    this.j = build(this.root);
    const [x0, y0, x1, y1] = (this.bounds = bounds);
    this.cam = new OrthographicCamera(x0, x1, y1, y0, -10, 10);
    this.rt = new WebGLRenderTarget(Math.min(1024, Math.ceil((x1 - x0) * RES)), Math.min(1024, Math.ceil((y1 - y0) * RES)), {
      samples: 4, generateMipmaps: true, minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter, depthBuffer: false,
    });
    this.mat = new ShaderMaterial({
      uniforms: { uMask: { value: this.rt.texture }, uR: { value: new Vector2() }, uLod: { value: 0 }, uDark: { value: 0.94 } },
      vertexShader: VERT, fragmentShader: SHADOW, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide, ...MULTIPLY,
    });
    this.quad = new Mesh(PLANE, this.mat);
    this.quad.renderOrder = 2;
    // where it is: x, y on the stage (screen pixels, y up), d its distance from the screen (0 = touching it)
    this.x = 0; this.y = 0; this.d = 0; this.dir = 1; this.tilt = 0; this.act = -1; this.pivot = [0, 0]; // act: seconds into a tap's trick
    this.sx = 0; this.sy = 0; this.size = 1; // where its shadow lands, and how big it is (for taps)
  }
  // lay the shadow: (sx, sy) is where the origin lands, f the scale, blur in screen pixels
  place(sx, sy, f, blur, dark) {
    const [x0, y0, x1, y1] = this.bounds;
    // a trick turns the shadow round its pivot (the fox's middle, the horse's hind hooves)
    const [px, py] = this.pivot, ox = px * f * this.dir, oy = py * f;
    const cx = ((x0 + x1) / 2) * f * this.dir - ox, cy = ((y0 + y1) / 2) * f - oy, c = Math.cos(this.tilt), s = Math.sin(this.tilt);
    const w = (x1 - x0) * f, h = (y1 - y0) * f;
    this.quad.position.set(sx + ox + cx * c - cy * s, sy + oy + cx * s + cy * c, 0);
    this.quad.rotation.z = this.tilt;
    this.quad.scale.set(w * this.dir, h, 1);
    const texels = (blur * this.rt.width) / w;
    this.mat.uniforms.uR.value.set(blur / w, blur / h);
    this.mat.uniforms.uLod.value = Math.max(0, Math.log2(Math.max(1, texels / 3)));
    this.mat.uniforms.uDark.value = dark;
    this.sx = this.quad.position.x; this.sy = this.quad.position.y; this.size = Math.max(w, h) / 2;
  }
  draw(renderer) {
    renderer.setRenderTarget(this.rt);
    renderer.render(this.scene, this.cam);
  }
  dispose() { this.rt.dispose(); this.mat.dispose(); this.scene.traverse((o) => o.geometry?.dispose()); }
}

// ---------- the puppets ----------
function fox() {
  return new Puppet([-165, -125, 115, 100], (r) => {
    r.add(rod(0, 46, -6, -125));
    const tail = joint(r, -48, 50, part(outline([[0, 4], [-14, 6], [-34, 14], [-64, 20], [-90, 14], [-104, 0, 1], [-86, -8], [-58, -6], [-32, -2], [-12, -4], [0, -4]], [hole(-88, 5, 6, 2.4)])));
    const legs = [[40, 36], [28, 36], [-34, 36], [-24, 36]].map(([x, y]) => joint(r, x, y, part(outline([[-6, 4], [6, 4], [4, -20], [2, -30], [8, -34, 1], [8, -37, 1], [-4, -37, 1], [-3, -20]]))));
    r.add(part(outline([[-54, 40], [-40, 56], [-10, 60], [24, 60], [48, 60], [62, 48], [58, 32], [40, 28], [24, 32], [-16, 34], [-46, 32]], [hole(-10, 46, 3), hole(2, 48, 3), hole(14, 47, 3)])));
    const head = joint(r, 54, 54, part(outline([[-8, -10], [4, -7], [22, -9], [44, -10, 1], [31, 0], [22, 6], [19, 25, 1], [11, 10], [4, 25, 1], [-6, 9]], [hole(21, 0, 2.6)])));
    return { tail, legs, head };
  });
}

function rider() {
  return new Puppet([-138, -125, 150, 215], (r) => {
    r.add(rod(0, 62, 8, -125));
    const tail = joint(r, -72, 70, part(outline([[0, 5], [-14, 1], [-27, -18], [-31, -48, 1], [-20, -28], [-8, -10], [3, -4]])));
    const legs = [[54, 52], [40, 52], [-52, 54], [-38, 54]].map(([x, y]) => {
      const up = joint(r, x, y, part(outline([[-7, 6], [7, 6], [5, -24], [-5, -24]])));
      const low = joint(up, 0, -22, part(outline([[-4, 2], [4, 2], [3, -20], [7, -30, 1], [-5, -30, 1], [-3, -20]])));
      return [up, low];
    });
    r.add(part(outline([[-76, 64], [-60, 78], [-20, 84], [30, 84], [62, 80], [76, 68], [70, 52], [44, 46], [-30, 46], [-64, 50]],
      [hole(-28, 64, 4), hole(-14, 62, 4), hole(0, 62, 4), hole(14, 64, 4), holeOf([[-36, 54], [24, 54], [24, 56], [-36, 56]])])));
    const head = joint(r, 60, 74,
      part(outline([[-6, 2], [-13, 10, 1], [-3, 13], [-7, 21, 1], [3, 23], [-1, 31, 1], [9, 33], [7, 41, 1], [15, 41], [17, 30], [6, 0]])),
      part(outline([[-10, -8], [-2, 6], [10, 26], [16, 42], [20, 56, 1], [25, 46], [36, 44], [58, 32], [65, 24], [61, 15, 1], [48, 16], [36, 20], [22, 10], [8, -10]], [hole(34, 37, 2.6)])));
    const man = joint(r, -4, 82);
    const cape = joint(man, -8, 36, part(outline([[2, 2], [-20, -6], [-38, -24], [-44, -44, 1], [-26, -38], [-8, -22], [5, -4]]), 0, 0, RED, 0));
    man.add(part(outline([[-6, 6], [8, 6], [12, -20], [21, -27, 1], [6, -29, 1], [2, -18]])));
    man.add(part(outline([[-11, 0], [11, 0], [13, 26], [8, 40], [-8, 40], [-13, 26]], [holeOf([[-8, 13], [8, 13], [8, 16], [-8, 16]])])));
    const hd = joint(man, 0, 40,
      part(oval(0, 12, 10, 11, [hole(4, 14, 1.8)])),
      part(outline([[8, 14], [14, 10, 1], [8, 7]], [], true)),
      part(outline([[-10, 19], [-10, 31, 1], [-5, 25, 1], [-1, 33, 1], [3, 25, 1], [7, 31, 1], [10, 19]], [], true), 0, 0, GOLD));
    const arm = joint(man, 6, 34, part(outline([[-3, -4], [24, -4], [27, 0], [24, 4], [-3, 4]])));
    joint(arm, 24, 0,
      part(outline([[0, -2], [44, -1.5], [54, 0, 1], [44, 1.5], [0, 2]], [], true)),
      part(outline([[2, -9], [6, -9], [6, 9], [2, 9]], [], true)),
      part(outline([[-8, -2.5], [2, -2.5], [2, 2.5], [-8, 2.5]], [], true)));
    return { tail, legs, head, man, cape, hd, arm };
  });
}

function bird() {
  return new Puppet([-52, -125, 42, 72], (r) => {
    r.add(rod(0, -4, -12, -125, 1.8));
    r.add(part(outline([[-12, 2], [-29, 9, 1], [-31, 0, 1], [-27, -7, 1], [-12, -3]])));
    r.add(part(oval(0, 0, 16, 8)));
    r.add(part(oval(14, 5, 7, 6.5, [hole(16, 7, 1.5)])));
    r.add(part(outline([[19, 7], [29, 3, 1], [19, 2]], [], true)));
    const wing = joint(r, 2, 4, part(outline([[-9, 0], [9, 0], [5, 18], [-2, 26, 1], [-13, 20]])));
    const tip = joint(wing, -4, 20, part(outline([[2, 0], [-6, 16], [-22, 34, 1], [-15, 12], [-8, 2]])));
    return { wing, tip };
  });
}

function dragon() {
  return new Puppet([-235, -105, 175, 150], (r) => {
    r.add(rod(-10, -10, -30, -105, 2.6));
    // the far wing first, so the body hides its root
    const wings = [[14, 14, 0.8], [4, 16, 1]].map(([x, y, s]) => {
      const w = joint(r, x, y);
      w.add(part(outline([[0, 0], [-8, 40], [-30, 72, 1], [-50, 50], [-72, 60, 1], [-80, 32], [-100, 36, 1], [-72, 4]]), 0, 0, RED, 0));
      for (const [tx, ty] of [[-30, 72], [-72, 60], [-100, 36]]) w.add(part(bar(0, 0, tx, ty, 3.4)));
      w.scale.setScalar(s);
      return w;
    });
    r.add(part(oval(0, 0, 36, 21, [hole(-14, 4, 4), hole(0, 6, 4), hole(14, 4, 4), hole(-7, -6, 3), hole(7, -6, 3)])));
    r.add(part(outline([[-4, 0], [4, 0], [6, -16], [13, -21, 1], [2, -23, 1], [-4, -14]]), 12, -15));
    r.add(part(outline([[-4, 0], [4, 0], [6, -16], [13, -21, 1], [2, -23, 1], [-4, -14]]), -16, -15));
    const neck = [];
    let at = joint(r, 28, 6);
    for (let i = 0; i < 3; i++) {
      at.add(part(oval(10, 0, 14, 10 - i)));
      at.add(part(outline([[2, 8 - i], [8, 17 - i, 1], [14, 8 - i]], [], true)));
      neck.push(at);
      at = joint(at, 20, 0);
    }
    const head = at;
    head.add(part(outline([[-6, -8], [10, -10], [34, -8], [48, -4, 1], [34, 0], [42, 5, 1], [24, 9], [14, 14], [8, 26, 1], [2, 12], [-5, 21, 1], [-9, 6]], [hole(19, 4, 3)])));
    const jaw = joint(head, 6, -6, part(outline([[0, 0], [30, -3], [42, -1, 1], [27, -10], [4, -10]])));
    const tail = [];
    at = joint(r, -30, 0);
    for (let i = 0; i < 6; i++) {
      at.add(part(oval(-9, 0, 13, 9 - i)));
      if (i % 2 === 0) at.add(part(outline([[-14, 8 - i], [-8, 16 - i, 1], [-2, 8 - i]], [], true)));
      tail.push(at);
      at = joint(at, -18, 0);
    }
    at.add(part(outline([[2, 0], [-14, 9, 1], [-32, 0, 1], [-14, -9, 1]], [hole(-14, 0, 2.5)], true)));
    return { wings, neck, head, jaw, tail };
  });
}

// hands near the lamp: a rabbit (one hand) or a bird (two hands crossed at the wrists)
function hands(kind) {
  return new Puppet([-170, -200, 170, 150], (r) => {
    if (kind === 'rabbit') {
      r.add(part(outline([[-26, -200, 1], [26, -200, 1], [28, -20], [-28, -20]], [], true)));
      r.add(part(outline([[-34, -20], [-30, 14], [-12, 30], [14, 30], [30, 16], [46, 8], [52, -2, 1], [34, -10], [30, -26], [-30, -28]], [hole(16, 6, 4.5, 3.5)])));
      const ears = [[-10, 24, 0.22], [8, 26, -0.08]].map(([x, y, a]) => {
        const e = joint(r, x, y, part(outline([[-8, 0], [8, 0], [9, 40], [3, 76, 1], [-5, 70], [-9, 40]])));
        e.rotation.z = a;
        return e;
      });
      return { ears };
    }
    r.add(part(outline([[-90, -200, 1], [-50, -200, 1], [10, -6], [-14, 10]], [], true)));
    r.add(part(outline([[90, -200, 1], [50, -200, 1], [-10, -6], [14, 10]], [], true)));
    r.add(part(oval(-14, 8, 20, 16)));
    r.add(part(oval(14, 8, 20, 16)));
    r.add(part(outline([[-7, 14], [7, 14], [9, 42], [22, 48, 1], [5, 54], [-5, 46]], [hole(4, 44, 2.5)])));
    const wings = [-1, 1].map((side) => {
      const w = joint(r, 26 * side, 12);
      for (let i = 0; i < 4; i++) {
        const a = (0.35 + i * 0.32) * side, len = 74 - i * 6;
        const f = joint(w, 0, 0, part(outline([[-6, 0], [6, 0], [7, len * 0.6], [3, len, 1], [-4, len * 0.95], [-7, len * 0.6]])));
        f.rotation.z = -a;
      }
      return w;
    });
    return { wings };
  });
}

// ---------- the scenery pressed against the screen: hills, a tree, a castle with flags ----------
const SCENERY = new MeshBasicMaterial({ color: 0xf2f2f2, side: DoubleSide, transparent: true, depthTest: false, depthWrite: false, ...MULTIPLY });
const flatPart = (shape, x = 0, y = 0) => { const m = new Mesh(new ShapeGeometry(shape, 8), SCENERY); m.position.set(x, y, 0); m.renderOrder = 1; return m; };

function castle() {
  const g = new Group(), flags = [];
  const arch = (x, y, w, h) => holeOf([[x - w, y], [x + w, y], [x + w, y + h - w], [x + w * 0.7, y + h - w * 0.3], [x, y + h], [x - w * 0.7, y + h - w * 0.3], [x - w, y + h - w]]);
  const merlons = (x0, x1, y, n) => { const p = []; const s = (x1 - x0) / n; for (let i = 0; i < n; i++) p.push([x0 + i * s, y + 9], [x0 + i * s + s / 2, y + 9], [x0 + i * s + s / 2, y], [x0 + (i + 1) * s, y]); return p; };
  g.add(flatPart(outline([[-48, 0], [48, 0], [48, 86], ...merlons(48, -48, 86, 6)], [arch(0, 3, 14, 33), arch(-26, 50, 5, 16), arch(26, 50, 5, 16)], true)));
  const tower = (x0, x1, top, apex, win) => {
    g.add(flatPart(outline([[x0, 0], [x1, 0], [x1, top], [x0, top]], [arch((x0 + x1) / 2, top - 34, 4.5, 15), ...(win ? [arch((x0 + x1) / 2, top - 74, 4, 13)] : [])], true)));
    g.add(flatPart(outline([[x0 - 6, top], [x1 + 6, top], [(x0 + x1) / 2, apex]], [], true)));
    g.add(flatPart(outline([[-1.2, 0], [1.2, 0], [1.2, 22], [-1.2, 22]], [], true), (x0 + x1) / 2, apex - 2));
    const flag = new Group();
    flag.position.set((x0 + x1) / 2 + 1, apex + 19, 0);
    flag.add(flatPart(outline([[0, 0], [24, -4], [16, -6], [26, -11, 1], [0, -12]], [], true)));
    g.add(flag);
    flags.push(flag);
  };
  tower(-82, -50, 122, 168, true);
  tower(50, 80, 108, 150, false);
  tower(-17, 17, 128, 186, false);
  return { g, flags };
}

function tree() {
  const g = new Group();
  g.add(flatPart(outline([[-9, 0, 1], [9, 0, 1], [7, 40], [24, 70], [20, 74], [5, 52], [6, 96], [-4, 96], [-5, 60], [-26, 82], [-30, 78], [-8, 44]])));
  const crown = new Group();
  crown.position.set(0, 84, 0);
  for (const [x, y, rx, ry] of [[-30, 10, 34, 26], [26, 4, 32, 24], [0, 34, 40, 30], [-18, 52, 24, 18], [20, 46, 24, 20]]) {
    crown.add(flatPart(oval(x, y, rx, ry, [hole(x + rx * 0.3, y - ry * 0.1, 3.5), hole(x - rx * 0.4, y + ry * 0.25, 2.5)])));
  }
  g.add(crown);
  return { g, crown };
}

// ---------- the screen itself ----------
// paper: long fibres both ways, a fine grain, and the seams where the sheets are glued. It doesn't move,
// so it's drawn once per window size and the screen only reads it back.
const PAPER = `
varying vec2 vUv;
uniform vec2 uRes;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
void main() {
  vec2 px = vUv * uRes;
  float fib = fbm(px * vec2(0.004, 0.035)) * 0.6 + fbm(px * vec2(0.03, 0.005) + 3.0) * 0.4;
  float v = 0.955 + 0.06 * fib + 0.02 * noise(px * 0.9);
  float seam = 1.0 - smoothstep(0.0, 2.5, abs(mod(px.x + 70.0, 360.0) - 180.0));
  gl_FragColor = vec4(vec3(v * (1.0 - 0.05 * seam) / 1.1), 1.0);
}`;
const SCREEN = `
varying vec2 vUv;
uniform vec2 uRes, uLamp; uniform float uFlick, uEdge; uniform sampler2D uPaper;
void main() {
  vec2 px = vUv * uRes;
  float d = length(px - uLamp) / max(uRes.x, uRes.y);
  // the flame is a white-gold spot, the rest a warm amber that never gets too dark for black text
  vec3 col = mix(vec3(0.93, 0.61, 0.29), vec3(1.0, 0.82, 0.52), exp(-d * d * 3.0));
  col = mix(col, vec3(1.0, 0.94, 0.78), exp(-d * d * 30.0) * 0.6);
  col *= texture2D(uPaper, vUv).r * 1.1;
  // darker only at the very edges, outside the reading column
  float e = smoothstep(0.0, uEdge, min(px.x, uRes.x - px.x)) * smoothstep(0.0, 26.0, px.y);
  col *= mix(0.5, 1.0, e);
  gl_FragColor = vec4(col * uFlick, 1.0);
}`;

export function start() {
  const st = makeStage({ alpha: false });
  if (!st) return () => {};
  const { renderer, size, pointer } = st;
  renderer.setClearColor(0x000000, 0);

  const main = new Scene();
  const cam = new OrthographicCamera(0, 1, 1, 0, -10, 10);
  const screen = new Mesh(PLANE, new ShaderMaterial({
    uniforms: { uRes: { value: new Vector2(1, 1) }, uLamp: { value: new Vector2() }, uFlick: { value: 1 }, uEdge: { value: 14 }, uPaper: { value: null } },
    vertexShader: VERT, fragmentShader: SCREEN, depthTest: false, depthWrite: false,
  }));
  main.add(screen);
  const paper = { rt: null, scene: new Scene(), mat: new ShaderMaterial({ uniforms: { uRes: { value: new Vector2() } }, vertexShader: VERT, fragmentShader: PAPER }) };
  const sheet = new Mesh(PLANE, paper.mat);
  sheet.scale.set(2, 2, 1);
  paper.scene.add(sheet);

  // the stage: hills along the bottom, a tree on the left, a castle on the right
  const scenery = new Group();
  main.add(scenery);
  const tr = tree(), cs = castle();
  scenery.add(tr.g, cs.g);
  let hill = null, k = 1, base = 0;
  const hillAt = (x) => k * (30 + 13 * Math.sin(x * 0.011 + 1) + 8 * Math.sin(x * 0.023 + 2.2) + 4 * Math.sin(x * 0.05));
  const ground = (x) => base + hillAt(x);
  function buildStage() {
    const { w, h } = size;
    k = clamp(Math.min(w, h * 1.3) / 1000, 0.5, 1.05);
    if (hill) { scenery.remove(hill); hill.geometry.dispose(); }
    const pts = [[-10, -40, 1]];
    for (let x = -10, i = 0; x <= w + 10; x += 7, i++) pts.push([x, hillAt(x) + (i % 2 ? 5 + (i * 7919 % 5) : 0) * k, 1]);
    pts.push([w + 10, -40, 1]);
    hill = flatPart(outline(pts, [], true));
    scenery.add(hill);
    const tx = Math.max(46, 80 * k), cx = w - Math.max(64, 130 * k);
    tr.g.position.set(tx, hillAt(tx) - 4 * k, 0); tr.g.scale.setScalar(k * 0.95);
    cs.g.position.set(cx, hillAt(cx) - 6 * k, 0); cs.g.scale.setScalar(k * (w < 600 ? 0.7 : 0.95));
    screen.position.set(w / 2, h / 2, 0); screen.scale.set(w, h, 1);
    screen.material.uniforms.uRes.value.set(w, h);
    paper.rt?.dispose();
    paper.rt = new WebGLRenderTarget(Math.ceil(w), Math.ceil(h), { depthBuffer: false });
    paper.mat.uniforms.uRes.value.set(w, h);
    renderer.setRenderTarget(paper.rt);
    renderer.render(paper.scene, new OrthographicCamera(-1, 1, 1, -1, -1, 1));
    renderer.setRenderTarget(null);
    screen.material.uniforms.uPaper.value = paper.rt.texture;
    screen.material.uniforms.uEdge.value = Math.max(14, (w - 1240) / 2);
    cam.right = w; cam.top = h; cam.updateProjectionMatrix();
  }

  // the cast
  const walkers = [
    Object.assign(fox(), { kind: 'fox', speed: 62, pivot: [0, 46] }),
    Object.assign(rider(), { kind: 'rider', speed: 84, pivot: [-50, 0] }),
  ];
  const birds = [0, 1, 2].map((i) => Object.assign(bird(), { kind: 'bird', speed: rnd(70, 120), phase: i * 2.1, home: 0.76 + i * 0.06 }));
  const zmeu = Object.assign(dragon(), { kind: 'dragon' });
  let hand = null, handAt = 12, handKind = 'rabbit';
  const all = () => [...walkers, ...birds, zmeu, ...(hand ? [hand] : [])];
  all().forEach((p) => main.add(p.quad));

  // where everyone starts, so the first picture (and the still one, with reduced motion) is a composed scene
  function place() {
    const { w, h } = size;
    walkers[0].x = w * 0.24; walkers[0].dir = 1;
    walkers[1].x = w * 0.64; walkers[1].dir = -1;
    birds.forEach((b, i) => { b.x = w * (0.18 + i * 0.22); b.y = h * b.home; b.dir = i % 2 ? -1 : 1; b.d = 0.08 * i; });
    zmeu.x = -9999; zmeu.next = 6; zmeu.d = 0.3;
  }

  // the lamp: it follows the pointer, and drifts a little by itself when nobody moves it
  const lamp = new Vector2(), lampTo = new Vector2();
  let flare = 0, last = 0, wind = 0, lastScroll = scrollY, dockCheck = 0, dockH = 0;
  // a puppet d away from the screen casts a shadow (1 / (1 - z)) times bigger, pushed away from the lamp
  const Z = 0.45;
  const project = (p, x, y) => {
    const z = p.d * Z, s = 1 / (1 - z);
    return { x: lamp.x + (x - lamp.x) * s, y: lamp.y + (y - lamp.y) * s, s, blur: (1.1 + 30 * z / (1 - z)) * (0.4 + 0.6 * k), dark: 0.95 - 0.38 * p.d };
  };

  function frame(t) {
    const dt = last ? Math.min(0.05, t - last) : 0;
    last = t;
    const { w, h } = size;
    const playing = state.player?.status === 'playing';
    if ((dockCheck -= dt) <= 0) {
      dockCheck = 0.5;
      dockH = document.querySelector('.dock.open .dock-bar')?.offsetHeight || 0;
    }
    base += ((dockH ? dockH - 6 : 0) - base) * Math.min(1, dt * 4 || 1);
    scenery.position.y = base;
    wind = Math.min(0.12, wind * (1 - dt * 1.5) + Math.abs(scrollY - lastScroll) * 0.0015);
    lastScroll = scrollY;

    // lamp and flame
    const idle = !pointer.seen || performance.now() - pointer.at > 9000;
    if (idle) lampTo.set(w / 2 + Math.sin(t * 0.21) * w * 0.14, h * 0.52 + Math.sin(t * 0.17 + 1) * h * 0.08);
    else lampTo.set(w / 2 + pointer.nx * w * 0.34, h / 2 + pointer.ny * h * 0.3);
    if (!dt) lamp.copy(lampTo); else lamp.lerp(lampTo, Math.min(1, dt * 3));
    flare = Math.max(0, flare - dt * 1.6);
    const flick = 0.975 + 0.012 * Math.sin(t * 13.1) + 0.01 * Math.sin(t * 7.3 + 1) + 0.008 * Math.sin(t * 23.7) + 0.04 * flare + (playing ? 0.015 : 0);
    screen.material.uniforms.uFlick.value = flick;
    screen.material.uniforms.uLamp.value.set(lamp.x + Math.sin(t * 17) * 3, lamp.y + Math.sin(t * 11) * 2);

    // the scenery sways in the wind (scrolling the page blows harder)
    const gust = 0.012 + Math.min(0.08, wind);
    tr.crown.rotation.z = Math.sin(t * 1.3) * gust;
    cs.flags.forEach((f, i) => { f.rotation.z = Math.sin(t * 5 + i) * (0.12 + wind); f.scale.x = 1 + Math.sin(t * 7 + i * 2) * 0.12; });

    // walkers go along the hills, turn round off screen, come closer to the lamp and back
    for (const p of walkers) {
      p.x += p.speed * k * dt * p.dir;
      if (p.x > w + 220 * k) p.dir = -1;
      if (p.x < -220 * k) p.dir = 1;
      p.d = 0.1 + 0.1 * Math.sin(t * 0.13 + (p.kind === 'fox' ? 0 : 2));
      const ph = p.x * (p.kind === 'fox' ? 0.09 : 0.07) / k * p.dir;
      const dance = playing ? Math.sin(t * 6) : 0;
      let lift = 0;
      p.tilt = 0;
      if (p.act >= 0) {
        p.act += dt;
        const u = p.act / (p.kind === 'fox' ? 1.1 : 1.5);
        if (u >= 1) p.act = -1;
        else if (p.kind === 'fox') { lift = 110 * Math.sin(Math.PI * u); p.tilt = TAU * u * p.dir; }
        else p.tilt = 0.42 * Math.sin(Math.PI * u) * p.dir;
      }
      const j = p.j;
      if (p.kind === 'fox') {
        j.legs.forEach((l, i) => { l.rotation.z = 0.5 * Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)); });
        j.head.rotation.z = 0.06 * Math.sin(ph * 2) + 0.12 * dance;
        j.tail.rotation.z = 0.14 * Math.sin(t * 2.2) + 0.08 + 0.2 * dance;
        p.root.position.y = 1.5 * Math.abs(Math.sin(ph)) + 4 * Math.abs(dance);
      } else {
        const rear = p.tilt ? 1 : 0;
        j.legs.forEach(([up, low], i) => {
          const s = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI));
          up.rotation.z = 0.45 * s + (i < 2 ? rear * 0.9 : 0);
          low.rotation.z = (i < 2 ? -0.7 : 0.5) * Math.max(0, Math.sin(ph + 1 + (i === 0 || i === 3 ? 0 : Math.PI))) - (i < 2 ? rear * 1.2 : 0);
        });
        p.root.position.y = 3 * Math.abs(Math.sin(ph)) + 3 * Math.abs(dance);
        j.head.rotation.z = 0.07 * Math.sin(ph * 2) + rear * 0.3;
        j.tail.rotation.z = 0.2 * Math.sin(t * 3) - wind * 2;
        j.man.position.y = 82 + 2 * Math.sin(ph * 2 + 0.6);
        j.cape.rotation.z = 0.12 * Math.sin(t * 6) + 0.1 + wind * 2;
        j.cape.scale.x = 1 + 0.12 * Math.sin(t * 7.3);
        const raise = rear || (t % 11 > 9) ? 1 : 0;
        j.arm.rotation.z += ((raise ? 1.25 : -0.25 + 0.08 * Math.sin(t)) - j.arm.rotation.z) * Math.min(1, dt * 6 || 1);
        j.hd.rotation.z = 0.05 * Math.sin(t * 1.7);
      }
      const sx = lamp.x + (p.x - lamp.x) / (1 - p.d * Z);
      const pr = project(p, p.x, 0);
      p.place(sx, ground(sx) + 2 * k + lift * k, k * pr.s, pr.blur, pr.dark);
    }

    // birds cross the sky in waves; a bird that leaves comes back from the other side at a new height
    for (const b of [...birds]) {
      b.x += b.speed * k * dt * b.dir;
      const off = b.x > w + 120 || b.x < -120;
      if (off && b.spawned) { birds.splice(birds.indexOf(b), 1); main.remove(b.quad); b.dispose(); continue; }
      if (off) { b.dir = -b.dir; b.home = rnd(0.72, 0.9); b.speed = rnd(70, 120); b.d = rnd(0, 0.28); }
      b.tilt = 0;
      const flap = t * (b.spawned ? 9 : 6.5) + b.phase;
      let loop = 0;
      if (b.act >= 0) { b.act += dt; const u = b.act / 1.2; if (u >= 1) b.act = -1; else { loop = u; b.tilt = TAU * u * b.dir; } }
      b.j.wing.scale.y = Math.cos(flap);
      b.j.wing.rotation.z = 0.25 * Math.sin(flap);
      b.j.tip.rotation.z = 0.5 * Math.sin(flap - 0.9);
      const y = b.spawned ? b.y + (b.x - b.x0) * 0.35 * b.dir : h * b.home + Math.sin(t * 0.9 + b.phase) * 26 * k + Math.sin(loop * TAU) * 60 * k;
      const pr = project(b, b.x, y);
      b.place(pr.x, pr.y, k * pr.s, pr.blur, pr.dark);
    }

    // the zmeu flies past every half minute or so, big and blurred, close to the lamp
    zmeu.next -= dt;
    if (zmeu.x < -9000 && zmeu.next <= 0) { zmeu.dir = Math.random() < 0.5 ? 1 : -1; zmeu.x = zmeu.dir > 0 ? -300 : w + 300; zmeu.y0 = h * rnd(0.5, 0.7); }
    if (zmeu.x > -9000) {
      zmeu.x += 150 * k * dt * zmeu.dir;
      if (zmeu.x > w + 340 || zmeu.x < -340) { zmeu.x = -9999; zmeu.next = rnd(24, 40); }
      const j = zmeu.j, roar = zmeu.act >= 0;
      if (roar) { zmeu.act += dt; if (zmeu.act > 1.6) zmeu.act = -1; }
      j.neck.forEach((n, i) => { n.rotation.z = 0.13 * Math.sin(t * 2.2 - i * 0.7) + (roar ? 0.12 : 0); });
      j.tail.forEach((n, i) => { n.rotation.z = 0.16 * Math.sin(t * 2.2 + 1 + i * 0.6); });
      j.jaw.rotation.z = roar ? -0.55 : -0.08 - 0.08 * Math.sin(t * 3);
      j.head.rotation.z = roar ? 0.1 * Math.sin(t * 30) : 0;
      j.wings.forEach((wg, i) => { const f = t * 3.2 - i * 0.35; wg.scale.y = (i ? 1 : 0.8) * Math.cos(f); wg.rotation.z = 0.18 * Math.sin(f); });
      zmeu.d = 0.32 + 0.1 * Math.sin(t * 0.4);
      const pr = project(zmeu, zmeu.x, zmeu.y0 + Math.sin(t * 1.1) * 40 * k);
      zmeu.place(pr.x, pr.y, k * pr.s, pr.blur, pr.dark);
    } else zmeu.place(-9999, -9999, k, 1, 0);

    // now and then two hands come up near the lamp and make a rabbit or a bird
    handAt -= dt;
    if (!hand && handAt <= 0) {
      hand = Object.assign(hands(handKind), { kind: 'hand', type: handKind, age: 0, x: w * rnd(0.3, 0.7), d: 0.52 });
      handKind = handKind === 'rabbit' ? 'bird' : 'rabbit';
      main.add(hand.quad);
    }
    if (hand) {
      hand.age += dt;
      const show = Math.min(1, hand.age / 1.6, Math.max(0, (8 - hand.age) / 1.6));
      if (hand.age > 8) { main.remove(hand.quad); hand.dispose(); hand = null; handAt = rnd(20, 32); }
      else {
        let hop = 0;
        if (hand.act >= 0) { hand.act += dt; if (hand.act > 0.8) hand.act = -1; else hop = Math.sin(Math.PI * hand.act / 0.8) * 70; }
        if (hand.type === 'rabbit') {
          const twitch = Math.sin(t * 9) * (Math.sin(t * 1.3) > 0.6 ? 0.18 : 0.02);
          hand.j.ears[0].rotation.z = 0.22 + twitch;
          hand.j.ears[1].rotation.z = -0.08 + twitch * 0.6;
        } else hand.j.wings.forEach((wg, i) => { wg.rotation.z = (i ? -1 : 1) * 0.35 * Math.sin(t * (hand.act >= 0 ? 12 : 5)); });
        // high enough to be seen, low enough that the arms still reach the bottom of the screen
        const y = base - 260 + show * (Math.min(h * 0.22, 190 * k * 1.3) + 260) + hop * k;
        const pr = project(hand, hand.x + Math.sin(t * 0.7) * 30 * k, y);
        hand.place(pr.x, pr.y, k * pr.s, pr.blur, pr.dark);
      }
    }

    for (const p of all()) if (p.sx > -5000) p.draw(renderer);
    renderer.setRenderTarget(null);
    renderer.render(main, cam);
  }

  // a tap on an empty spot: the nearest shadow does its trick, or a bird flies off from there
  st.onTap((x, y) => {
    const Y = size.h - y;
    flare = 1;
    let best = null, bd = Infinity;
    for (const p of all()) {
      const dd = Math.hypot(p.sx - x, p.sy - Y) / p.size;
      if (dd < bd) { bd = dd; best = p; }
    }
    if (best && bd < 1.1) { if (best.act < 0) best.act = 0; return; }
    if (birds.length > 9) return;
    const b = Object.assign(bird(), { kind: 'bird', spawned: true, speed: rnd(120, 170), phase: rnd(0, TAU), x: x, x0: x, y: Y, dir: x < size.w / 2 ? -1 : 1, d: 0.12 });
    birds.push(b);
    main.add(b.quad);
  });

  st.onResize(() => { buildStage(); if (!last) place(); if (calm()) { last = 0; frame(performance.now() / 1000); } });
  st.loop(frame);
  return () => {
    all().forEach((p) => p.dispose());
    main.traverse((o) => o.geometry !== PLANE && o.geometry?.dispose());
    paper.rt?.dispose();
    st.dispose();
  };
}
