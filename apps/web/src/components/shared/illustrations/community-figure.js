// Composition adapted from the Hairline Firecrawl Reader demo by Lucas Marques (MIT).
import { HL } from "./hairline-kernel.js";
const {
  Cam, clamp, facing, fit, open, poly, prism, proj, rad, rings, rrect, seg, solid, put,
  spring, stepS, tween, tset, tval, tdone, disposer, mk, pointer, register,
} = HL;

const PW = 96, PH = 130, D = 3, T0 = 16, T1 = 126, REST = 30;
const DX0 = 18, YL = 20, YR = -40, DT = 2, K = 0.5, N = 10, LAG = 0.55;
/** What the page holds, top to bottom: [kind, u0, u1, t]; kind 0 heading, 1 text, 2 picture, 3 list item. */
const ITEMS = [[0, 8, 62, 24], [1, 8, 88, 35], [1, 8, 84, 42], [1, 8, 58, 49], [2, 8, 52, 69],
  [3, 16, 70, 91], [3, 16, 80, 98], [3, 16, 60, 105], [1, 8, 86, 115], [1, 8, 64, 122]];
/** Each kind: half width on the page, half width on the sheet, where on the sheet it starts, its length there (0: as on the page). */
const KIND = [[1.8, 2.1, 14, 0], [0, 0, 14, 0], [12, 1.6, 9, 16], [0, 0, 10, 0]];

/**
 * A thin slab from two outlines of the same points on screen, its front and its back: the back's outline,
 * the walls that face you (those whose outward edge points the way the back is shifted), their turning edges, the front.
 */
function slab(front, back) {
  const n = front.length, o = [back[0][0] - front[0][0], back[0][1] - front[0][1]];
  const area = front.reduce((a, p, i) => { const q = front[(i + 1) % n]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
  const vis = front.map((p, i) => { const q = front[(i + 1) % n], ex = q[0] - p[0], ey = q[1] - p[1]; return (area > 0 ? ey * o[0] - ex * o[1] : ex * o[1] - ey * o[0]) > 0; });
  let walls = "", turns = "";
  front.forEach((p, i) => {
    const j = (i + 1) % n;
    if (vis[i]) walls += poly([p, front[j], back[j], back[i]]);
    if (vis[i] !== vis[(i + n - 1) % n]) turns += seg(p, back[i]);
  });
  return [poly(back), walls, turns, poly(front)];
}

/** @param {SVGSVGElement} svg */
export function mountCommunityIllustration(svg) {
  const bag = disposer();
  const fly = 700;

  const C = Cam(45, 0.5, 1.6);
  fit(C, [[0, PW / 2, 0], [0, -PW / 2, 0], [-D, PW / 2, PH], [0, -PW / 2, PH], [100, YL, 0], [100, YR, 0], [DX0, YR, 0]], 200, 162);
  const P = proj(C), front = facing(C);
  /** A point on the page's face, or a plane x in front of or behind it, from the page's own (u right, t down). */
  const W = (u, t, x = 0) => P(x, PW / 2 - u, PH - t);
  const ring = (q, x = 0) => q.map((p) => W(p.u, p.v, x));

  const g = mk("g", { transform: "translate(400 0) scale(-1 1)" }, svg);
  const draw = (paths) => {
    const classes = ["sil", "fo", "sil nf", "sil"];
    paths.forEach((d, i) => mk("path", { class: classes[i], d }, g));
  };

  // the page: a thin standing sheet, its top bar (three dots, the address pill), and the picture's drawing
  const edge = rrect(0, 0, PW, PH, 2, 3);
  draw(slab(ring(edge), ring(edge, -D)));
  const dot = (u, t, r) => poly(Array.from({ length: 12 }, (_, k) => W(u + r * Math.cos(rad(k * 30)), t + r * Math.sin(rad(k * 30)))));
  mk("path", { class: "nf lo", d: [7, 12, 17].map((u) => dot(u, 7, 1.3)).join("") + poly(ring(rrect(24, 4.5, 88, 9.5, 2.5))) + seg(W(0, 14), W(PW, 14)) }, g);
  const art = mk("path", { class: "nf lo", d: open([[11, 78], [21, 67], [27, 72], [36, 62], [49, 78]].map(([u, t]) => W(u, t))) + dot(18, 63, 2.4) }, g);

  // where each part was: a dashed ghost on the face, under the part itself
  const ghosts = mk("path", { class: "nf lo dash" }, g);
  // the read-line across the face, a tick standing at each edge
  const line = mk("path", { class: "nf hi" }, g);

  // the sheet at the page's foot, which feeds out as parts land on it
  const sheet = solid(g), rowX = ITEMS.map((_, k) => DX0 + 8 + k * 7 + (k ? 3 : 0)), grow = spring(rowX[0] + 7, { k: 40, c: 13 });
  let sheetAt = NaN;

  // each part: on the page it lies on the face; peeling, its far end leads, twisting flat; landed it lies on the sheet
  const strips = mk("g", {}, g);
  const items = ITEMS.map(([kind, u0, u1, t], k) => {
    const [r0, r1, y0, l1] = KIND[kind];
    return { kind, u0, u1, t, r0, r1, x1: rowX[k], y1: YL - y0, len: l1 || (u1 - u0) * K,
      el: mk("path", { class: kind === 0 ? "sil" : kind === 2 ? "nf lo" : "lo" }, strips), tw: tween(k === 0 ? 1 : 0, fly), drawn: NaN, read: k === 0 };
  });
  ghosts.setAttribute("d", items.map((it) => it.r0
    ? poly([[it.u0, it.t - it.r0], [it.u1, it.t - it.r0], [it.u1, it.t + it.r0], [it.u0, it.t + it.r0]].map(([u, t]) => W(u, t, 0.2)))
    : seg(W(it.u0, it.t, 0.2), W(it.u1, it.t, 0.2))).join(""));

  /** A point of a part at s along it (0 its near end, 1 its far end), q of the way from the page to the sheet, lifted on the way. */
  function at3(it, s, q, dp = 0, ds = 0) {
    const p = [0.3, PW / 2 - it.u0 - (it.u1 - it.u0) * s + dp, PH - it.t], w = [it.x1, it.y1 - it.len * s + ds, DT + 0.2];
    return p.map((v, i) => v + (w[i] - v) * q + (i === 2 ? 14 * Math.sin(Math.PI * q) : 0));
  }
  /** Across the part at q: upright on the page, lying on the sheet. */
  const across = (q, r) => [r * Math.sin((Math.PI / 2) * q), 0, r * Math.cos((Math.PI / 2) * q)];
  const off = (c, h, m = 1) => P(...c.map((v, i) => v + h[i] * m));
  function paintItem(it, e) {
    if (it.drawn === e) return;
    it.drawn = e;
    const side = [], back = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, q = clamp(e * (1 + LAG) - LAG * (1 - s), 0, 1), c = at3(it, s, q);
      const h = across(q, it.r0 + (it.r1 - it.r0) * q + 1.3 * Math.sin(Math.PI * q));
      side.push(off(c, h)); back.unshift(off(c, h, -1));
    }
    let d = poly([...side, ...back]);
    const q = clamp(e * (1 + LAG) - LAG, 0, 1);
    if (it.kind === 3 || (it.kind === 2 && q > 0)) {
      // its mark before it: a list item's bullet that becomes a dash; the picture's square, only once it leaves
      const c = at3(it, 0, q, 4, 4.5), h = across(q, 1);
      const [ml, mw] = it.kind === 3 ? [0.9 + 0.7 * q, 0.9 - 0.3 * q] : [2.2 * q, 2.2 * q];
      d += poly([[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([a, b]) => P(c[0] + h[0] * mw * b, c[1] - ml * a, c[2] + h[2] * mw * b)));
    }
    it.el.setAttribute("d", d);
  }

  const pos = spring(REST, { k: 30, c: 11 });
  let drawnT = NaN;
  function paintLine(t) {
    if (t === drawnT) return;
    drawnT = t;
    line.setAttribute("d", seg(W(-3, t, 0.4), W(PW + 3, t, 0.4)) + seg(W(-3, t - 3, 0.4), W(-3, t + 3, 0.4)) + seg(W(PW + 3, t - 3, 0.4), W(PW + 3, t + 3, 0.4)));
  }

  const B = register(svg, (dt, now) => {
    let moving = stepS(pos, dt);
    paintLine(pos.x);
    let n = 0;
    items.forEach((it) => {
      const r = pos.x >= it.t - 2;
      if (r !== it.read) { it.read = r; it.tw.dur = fly; tset(it.tw, r ? 1 : 0, now, 0); }
      if (it.read) n++;
      paintItem(it, tval(it.tw, now));
      if (!tdone(it.tw, now)) moving = true;
    });
    art.classList.toggle("dash", items[4].read);
    grow.t = rowX[Math.max(0, n - 1)] + 7;
    if (stepS(grow, dt)) moving = true;
    if (grow.x !== sheetAt) { sheetAt = grow.x; put(sheet, prism(P, front, ...rings(DX0, YR, sheetAt, YL, 4, 2), 0, DT)); }
    return moving;
  });
  bag.add(B.unregister);

  const zf = Math.sqrt(1 - C.k * C.k), cs = Math.cos(C.az), sn = Math.sin(C.az);
  function aim(target) {
    pos.t = target === null ? REST : clamp(target, T0, T1);
    B.wake();
  }
  // Undo the horizontal mirror before projecting the pointer onto the standing page.
  bag.add(pointer(svg, {
    move: ([screenX, screenY]) => {
      const y = -(400 - screenX - C.ox) / (C.S * sn);
      const z = (y * cs * C.k - (screenY - C.oy) / C.S) / zf;
      aim(PH - z);
    },
    leave: () => aim(null),
  }));
  // Keep the surrounding page scrollable while the wheel moves the reading line.
  bag.on(svg, "wheel", (event) => {
    if (event.ctrlKey || event.deltaY === 0) return;
    const unit = [0.23, 4, 30][event.deltaMode] ?? 0.23;
    aim(pos.t + event.deltaY * unit);
  }, { passive: true });
  bag.add(() => g.remove());

  return bag.dispose;
}
