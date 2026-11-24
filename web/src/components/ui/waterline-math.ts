export type WaterBody2D = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export type WaterDroplet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  k: number;
};

export type WaterRipple = {
  x: number;
  y: number;
  age: number;
  amp: number;
};

export type WaterPillTarget = {
  x: number;
  y: number;
  q: number;
  r: number;
};

export type WaterPillState = {
  a: WaterBody2D;
  b: WaterBody2D;
  q: number;
  r: number;
  sy: { s: number; v: number };
  lead: 0 | 1;
  lagFrom: number;
  sats: WaterDroplet[];
  rips: WaterRipple[];
  t: WaterPillTarget;
  mouse: { x: number; y: number; s: number; on: boolean };
  moving: boolean;
  split: boolean;
  ready: boolean;
  w: number;
  h: number;
  pad: number;
  time: number;
};

export function createWaterPillState(pad = 10): WaterPillState {
  return {
    a: { x: 0, y: 0, vx: 0, vy: 0 },
    b: { x: 0, y: 0, vx: 0, vy: 0 },
    q: 12,
    r: 15,
    sy: { s: 1, v: 0 },
    lead: 0,
    lagFrom: 0,
    sats: [],
    rips: [],
    t: { x: 0, y: 0, q: 12, r: 15 },
    mouse: { x: 0, y: 0, s: 0, on: false },
    moving: false,
    split: false,
    ready: false,
    w: 0,
    h: 0,
    pad,
    time: 0,
  };
}

export function resolvePillKey(
  id: string | null,
  waterId: string | null,
  ariaLabel: string | null,
  className: string,
  fallbackIndex: number
): string {
  if (waterId) return `wl:${waterId}`;
  if (id) return `id:${id}`;
  if (className.includes("mode-seg")) return "mode-seg";
  if (className.includes("m-tabs")) return "modal-tabs";
  if (ariaLabel) return `aria:${ariaLabel}`;
  return `seg:${fallbackIndex}`;
}

export function retargetWaterPill(
  s: WaterPillState,
  nx: number,
  ny: number,
  nq: number,
  nr: number,
  w: number,
  h: number,
  now: number
): void {
  s.w = w;
  s.h = h;
  s.t.q = Math.max(0, nq);
  s.t.r = Math.max(8, nr);

  if (!s.ready) {
    s.a.x = s.b.x = nx;
    s.a.y = s.b.y = ny;
    s.a.vx = s.b.vx = 0;
    s.a.vy = s.b.vy = 0;
    s.q = s.t.q;
    s.r = s.t.r;
    s.ready = true;
  } else {
    const dist = Math.hypot(nx - s.t.x, ny - s.t.y);
    if (dist > 0.5) {
      const da = Math.hypot(nx - s.a.x, ny - s.a.y);
      const db = Math.hypot(nx - s.b.x, ny - s.b.y);
      s.lead = da <= db ? 0 : 1;
      s.lagFrom = now + 70;
      s.moving = true;
      s.split = false;
    }
  }
  s.t.x = nx;
  s.t.y = ny;
}

export function stepWaterPill(
  s: WaterPillState,
  dt: number,
  now: number,
  reduceMotion: boolean,
  rand: () => number = Math.random
): boolean {
  const T = s.t;
  s.time += dt;
  const lerpRate = Math.min(1, dt * 12);
  s.q += (T.q - s.q) * lerpRate;
  s.r += (T.r - s.r) * lerpRate;

  const bodies: [WaterBody2D, WaterBody2D] = [s.a, s.b];
  let still = true;

  if (reduceMotion) {
    s.a.x = s.b.x = T.x;
    s.a.y = s.b.y = T.y;
    s.a.vx = s.b.vx = 0;
    s.a.vy = s.b.vy = 0;
    s.q = T.q;
    s.r = T.r;
    s.sy.s = 1;
    s.sy.v = 0;
    s.sats = [];
  } else {
    bodies.forEach((B, i) => {
      const isLead = i === s.lead;
      const k = isLead ? 210 : 72;
      const c = isLead ? 25 : 13;
      const f = !isLead && now < s.lagFrom ? 0.08 : 1;

      B.vx += (k * (T.x - B.x) - c * B.vx) * dt * f;
      B.vy += (k * (T.y - B.y) - c * B.vy) * dt * f;
      B.x += B.vx * dt;
      B.y += B.vy * dt;

      const loX = s.pad + 4 + s.q + s.r - 3;
      const hiX = s.pad + s.w - 4 - s.q - s.r + 3;
      if (hiX >= loX && (B.x < loX || B.x > hiX)) {
        s.sy.v -= Math.min(Math.abs(B.vx), 900) * 0.0016;
        B.x = Math.max(loX, Math.min(hiX, B.x));
        B.vx *= -0.25;
      }

      const loY = s.pad + 4 + s.r - 2;
      const hiY = s.pad + s.h - 4 - s.r + 2;
      if (hiY >= loY && (B.y < loY || B.y > hiY)) {
        B.y = Math.max(loY, Math.min(hiY, B.y));
        B.vy *= -0.25;
      }

      if (
        Math.hypot(T.x - B.x, T.y - B.y) > 0.35 ||
        Math.hypot(B.vx, B.vy) > 3
      ) {
        still = false;
      }
    });

    const L = bodies[s.lead];
    const speed = Math.hypot(L.vx, L.vy);
    const syT = 1 - 0.2 * Math.min(speed / 1500, 1);
    s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt;
    s.sy.s += s.sy.v * dt;
    if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) {
      still = false;
    }

    const sep = Math.hypot(s.a.x - s.b.x, s.a.y - s.b.y);
    const thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1);
    const r = T.r * (1 - 0.3 * thin);

    if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -6) {
      s.split = true;
      const lo = bodies[1 - s.lead];
      const hi = bodies[s.lead];
      [0.3, 0.5, 0.72].forEach((t, j) => {
        s.sats.push({
          x: lo.x + (hi.x - lo.x) * t + (rand() - 0.5) * 6,
          y: lo.y + (hi.y - lo.y) * t + (rand() - 0.5) * 8,
          vx: (lo.vx + hi.vx) * 0.45,
          vy: (lo.vy + hi.vy) * 0.45 + (rand() - 0.5) * 44,
          r: Math.max(2.6, 4.2 + rand() * 2.2 - j * 0.45),
          k: 70 + rand() * 90,
        });
      });
    }

    s.sats = s.sats.filter((d) => {
      d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt;
      d.vy += (90 * (T.y - d.y) - 7 * d.vy) * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.x = Math.max(s.pad + 6 + d.r, Math.min(s.pad + s.w - 6 - d.r, d.x));
      d.y = Math.max(s.pad + 4 + d.r, Math.min(s.pad + s.h - 4 - d.r, d.y));
      if (Math.hypot(T.x - d.x, T.y - d.y) < T.q + T.r * 0.55) {
        d.r -= dt * 26;
      }
      return d.r > 0.6;
    });
    if (s.sats.length) still = false;
  }

  if (s.moving && still) {
    s.moving = false;
    if (s.split || !reduceMotion) {
      s.rips.push({ x: T.x, y: T.y, age: 0, amp: s.split ? 1.15 : 0.7 });
    }
  }

  s.rips.forEach((p) => {
    p.age += dt;
  });
  s.rips = s.rips.filter((p) => p.age < 2.2);

  const mTarget = s.mouse.on ? 1 : 0;
  s.mouse.s += (mTarget - s.mouse.s) * Math.min(1, dt * 7);

  return s.moving || s.rips.length > 0 || s.sats.length > 0 || s.mouse.s > 0.01;
}
