// A cover drawn in code for a recording without a picture: shapes made of CSS gradients and the story's title
// set over them. The drawing becomes the cover's own --cover-bg, so every theme frames it the way it framed
// the old plain cover. Each page load deals new drawings; until then a story keeps the same one everywhere.
// No canvas and no image files: the browser paints a few gradients, and each title is drawn once per visit.

const visit = (Math.random() * 2 ** 32) >>> 0;
const drawn = new Map();

export function art(title) {
  if (!drawn.has(title)) drawn.set(title, draw(title));
  return drawn.get(title);
}

function draw(title) {
  // mulberry32, seeded with this visit and the title
  let h = visit;
  for (let i = 0; i < title.length; i++) h = Math.imul(h ^ title.charCodeAt(i), 2654435761);
  const rnd = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
  const R = (a, b) => Math.round((a + rnd() * (b - a)) * 100) / 100;
  const pick = (xs) => xs[Math.floor(rnd() * xs.length)];

  // Palette: a base hue and three others around it. The shapes stay on one side of the lightness scale and
  // the title on the other, so the title reads on any of them. Violet is skipped (the Taste Skill guide bans it).
  const night = rnd() < 0.12;
  const dark = night || rnd() < 0.3;
  let h0 = R(0, 360);
  if (dark && h0 > 50 && h0 < 140) h0 += 120; // a dark yellow is mud
  const offs = pick([[0, 30, 60, 90], [0, 180, 30, 210], [0, 120, 240, 60], [0, 150, 210, 40], [0, 45, 190, 235]]);
  const hue = (o) => { const x = (h0 + o) % 360; return Math.round(x > 275 && x < 325 ? x + 50 : x); };
  const col = (l, c, o) => `oklch(${l} ${c} ${hue(o)})`;
  const bg = dark ? col(R(0.2, 0.3), R(0.03, 0.08), offs[0]) : col(R(0.9, 0.96), R(0.03, 0.07), offs[0]);
  const F = offs.map((o) => (dark ? col(R(0.34, 0.56), R(0.09, 0.16), o) : col(R(0.64, 0.86), R(0.1, 0.17), o)));
  const FB = [...F, bg];
  const clear = (c, p) => `color-mix(in oklch, ${c} ${p}%, #0000)`;

  const disc = (x, y, r, c) => `radial-gradient(${r}% ${r}% at ${x}% ${y}%, ${c} calc(100% - 1px), #0000 100%)`;
  const sun = () => { const x = R(12, 88), y = R(10, 38), c = F[3]; return [disc(x, y, R(8, 15), c), `radial-gradient(38% 38% at ${x}% ${y}%, ${clear(c, 45)}, #0000)`]; };

  const motifs = [
    // hills under a sun
    () => [...Array.from({ length: pick([2, 3]) }, (_, i) =>
      `radial-gradient(${R(60, 110)}% ${R(20, 28) + i * 12}% at ${R(0, 100)}% ${R(100, 106)}%, ${F[i]} calc(100% - 1px), #0000 100%)`), ...sun()],
    // rays from a corner, an edge or the middle
    () => {
      const s = 180 / pick([10, 12, 16, 20]);
      const [x, y] = pick([[50, 50], [0, 100], [100, 0], [50, 112], [R(20, 80), R(20, 80)]]);
      return [disc(x, y, R(10, 20), F[1]), `repeating-conic-gradient(from ${R(0, 90)}deg at ${x}% ${y}%, ${F[0]} 0 ${s}deg, #0000 0 ${2 * s}deg)`];
    },
    // rings
    () => {
      const w = R(4, 8);
      const [x, y] = pick([[0, 0], [100, 100], [0, 100], [50, 50], [R(0, 100), R(0, 100)]]);
      return [`repeating-radial-gradient(circle at ${x}% ${y}%, ${F[0]} 0 ${w}%, ${F[1]} 0 ${2 * w}%, ${F[2]} 0 ${3 * w}%, #0000 0 ${4 * w}%)`];
    },
    // bands like a flag, with a round hole
    () => {
      let at = 0;
      const stops = F.map((c) => `${c} ${at}% ${(at = Math.min(100, Math.round(at + R(14, 32))))}%`);
      return [disc(R(25, 75), R(25, 75), R(12, 22), bg), `linear-gradient(${R(0, 180)}deg, ${stops.join(', ')}, #0000 0)`];
    },
    // polka dots over a big circle
    () => {
      const s = pick([20, 25, 33.33]), d = R(12, 18);
      return [
        `radial-gradient(circle at 25% 25%, ${F[0]} ${d}%, #0000 ${d + 1}%) 0 0 / ${s}% ${s}%`,
        `radial-gradient(circle at 75% 75%, ${F[1]} ${d}%, #0000 ${d + 1}%) 0 0 / ${s}% ${s}%`,
        disc(R(10, 90), R(10, 90), R(30, 48), F[2]),
      ];
    },
    // Bauhaus tiles: a 2×2 or 3×3 grid, each tile with a quarter circle, a half circle, a circle or a triangle
    () => {
      const n = pick([2, 3]), top = [], under = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const at = `${(i * 100) / (n - 1)}% ${(j * 100) / (n - 1)}% / ${100 / n}% ${100 / n}% no-repeat`;
        const a = pick(FB), b = pick(FB.filter((c) => c !== a));
        under.push(`linear-gradient(${a}, ${a}) ${at}`);
        const shape = pick([
          `radial-gradient(100% 100% at ${pick(['0 0', '100% 0', '0 100%', '100% 100%'])}, ${b} calc(100% - 1px), #0000 100%)`,
          `radial-gradient(${pick(['50% 100% at 50% 100%', '50% 100% at 50% 0', '100% 50% at 0 50%', '100% 50% at 100% 50%'])}, ${b} calc(100% - 1px), #0000 100%)`,
          `radial-gradient(36% 36% at 50% 50%, ${b} calc(100% - 1px), #0000 100%)`,
          `linear-gradient(${pick([45, 135, 225, 315])}deg, ${b} 50%, #0000 0)`,
          '',
        ]);
        if (shape) top.push(`${shape} ${at}`);
      }
      return [...top, ...under];
    },
    // soft northern lights
    () => F.map((c) => `radial-gradient(${R(45, 85)}% ${R(45, 85)}% at ${R(0, 100)}% ${R(0, 100)}%, ${c}, #0000)`),
    // waves: three rows of humps, the front one lowest, under a sun
    () => {
      const s = pick([20, 25, 33.33]), out = [];
      for (let i = 0; i < 3; i++) {
        const band = 12 + i * R(12, 15), hump = s / 2, y = ((100 - band - hump) / (100 - hump)) * 100;
        out.push(`radial-gradient(50% 100% at 50% 100%, ${F[i]} calc(100% - 1px), #0000 100%) ${R(0, 100)}% ${y}% / ${s}% ${hump}% repeat-x`,
          `linear-gradient(${F[i]}, ${F[i]}) 0 100% / 100% ${band}% no-repeat`);
      }
      return [...out, ...sun()];
    },
    // confetti: circles and rings
    () => Array.from({ length: Math.floor(R(8, 15)) }, () => {
      const x = R(0, 100), y = R(0, 100), r = R(4, 15), c = pick(F);
      return rnd() < 0.3 ? `radial-gradient(${r}% ${r}% at ${x}% ${y}%, #0000 62%, ${c} 63% calc(100% - 1px), #0000 100%)` : disc(x, y, r, c);
    }),
    // a picnic cloth with a plate on it
    () => {
      const w = pick([5, 6.25, 8.33, 10]), c = clear(F[0], 55);
      return [disc(R(15, 85), R(15, 85), R(28, 40), F[1]),
        `repeating-linear-gradient(0deg, ${c} 0 ${w}%, #0000 0 ${2 * w}%)`, `repeating-linear-gradient(90deg, ${c} 0 ${w}%, #0000 0 ${2 * w}%)`];
    },
    // a rainbow arch from an edge or a corner
    () => {
      const [x, y] = pick([[50, 100], [0, 100], [100, 100], [0, 0], [50, 0]]), r = R(70, 100), b = R(9, 13), h = 100 - 4 * b;
      return [`radial-gradient(${r}% ${r}% at ${x}% ${y}%, #0000 ${h}%, ${F[0]} 0 ${h + b}%, ${F[1]} 0 ${h + 2 * b}%, ${F[2]} 0 ${h + 3 * b}%, ${F[3]} 0 calc(100% - 1px), #0000 100%)`];
    },
  ];

  // a night sky: stars, a crescent moon on the right (the title keeps to the left or sits on a label) and dark hills
  const sky = () => {
    const x = R(56, 84), y = R(12, 28), r = R(9, 13), moon = col(0.93, 0.08, offs[1]);
    const stars = Array.from({ length: 14 }, () => { const s = R(0.6, 1.4); return `radial-gradient(${s}% ${s}% at ${R(0, 100)}% ${R(0, 70)}%, ${col(0.96, 0.05, offs[2])}, #0000)`; });
    return [
      `radial-gradient(${R(70, 110)}% ${R(18, 26)}% at ${R(0, 100)}% 104%, ${col(0.16, 0.04, offs[0])} calc(100% - 1px), #0000 100%)`,
      disc(x + r * 0.45, y - r * 0.25, r, bg), disc(x, y, r, moon), ...stars, `linear-gradient(${bg} 35%, ${F[0]})`,
    ];
  };

  // the labels' colour, dark enough for white letters: not a yellow, which turns olive that dark
  const mo = [offs[1], offs[2], offs[3], offs[0]].find((o) => hue(o) < 55 || hue(o) > 135);
  const words = title.split(/\s+/).filter(Boolean);
  const longest = Math.max(1, ...words.map((w) => w.length));
  return {
    // 0 bottom, 1 top right, 2 up the left edge, 3 on coloured labels, 4 tilted with a 3D shadow, 5 on a band
    layout: night ? pick([2, 3, 5]) : Math.floor(rnd() * 6),
    words,
    style: {
      '--cover-bg': [...(night ? sky() : pick(motifs)()), bg].join(', '),
      '--t': dark ? col(0.97, 0.02, offs[0]) : col(0.24, 0.07, offs[0]),
      '--t2': dark ? col(0.92, 0.09, offs[2]) : col(0.3, 0.13, offs[1]),
      '--m': col(R(0.38, 0.48), R(0.13, 0.17), mo),
      '--mt': col(0.985, 0.012, mo),
      '--rot': `${R(-7, 7)}deg`,
      // the title fills the cover without a word ever wider than it (cqi: a hundredth of the cover's width)
      '--fs': Math.min(70 / Math.sqrt(title.length || 1), 125 / longest, 22).toFixed(2),
    },
  };
}
