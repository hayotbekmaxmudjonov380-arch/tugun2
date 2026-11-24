import {
  createWaterPillState,
  resolvePillKey,
  retargetWaterPill,
  stepWaterPill,
  type WaterPillState,
} from "./waterline-math";

const PILL_SELECTOR = ".mode-seg, .seg";

const RIPPLE_TARGET_SELECTOR = [
  ".btn",
  ".icon-btn",
  ".search-btn",
  ".bell",
  ".whoami",
  ".dept-tab",
  ".rail-task",
  ".rail-nav",
  ".task-block",
  ".clock-btn",
  ".k-key",
  ".pos-item",
  ".bg-opt",
  ".pick span",
  ".spot-item",
  ".dash-tile",
  ".hero-card",
  ".stat",
  ".staff-tile",
  ".rule",
  ".help-card",
  ".g-label",
  ".sbar-row",
  ".upcoming li",
  ".mini-tasks li",
  ".alerts li",
  ".chip",
].join(",");

const MENISCUS_SELECTOR = [
  ".hero-card",
  ".dash-tile",
  ".stat",
  ".welcome",
  ".rail-task",
  ".task-block",
  ".dept-tab",
  ".staff-tile",
  ".panel",
  ".help-card",
  ".rule",
  ".nz-mine",
  ".nz-doc",
  ".pos-block",
  ".pos-item",
  ".att-dept",
  ".btn",
  ".search-btn",
  ".whoami",
  ".clock-btn",
  ".k-key",
  ".bg-opt",
  ".pick span",
  ".spot-item",
  ".upcoming li",
  ".mini-tasks li",
  ".g-label",
  ".k-panel",
].join(",");

type ManagedPill = {
  key: string;
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  state: WaterPillState;
  ro: ResizeObserver;
  onMove: (e: PointerEvent) => void;
  onLeave: () => void;
  onDown: (e: PointerEvent) => void;
  onClick: () => void;
};

const pillStates = new Map<string, WaterPillState>();
const activePills = new Map<HTMLElement, ManagedPill>();
let pillRaf = 0;
let lastFrameTime = 0;
let initialized = false;
let currentHoverEl: HTMLElement | null = null;
let pendingHoverMove: { el: HTMLElement; x: number; y: number } | null = null;
let hoverRaf = 0;
let lastRouteKey = "";

function isReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  const mode = root.getAttribute("data-mode");
  const theme = root.getAttribute("data-theme");
  if (mode === "night") return true;
  if (mode === "day") return false;
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function drawCapsule(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  q: number,
  r: number,
  sy: number
): void {
  const sameRow = Math.abs(ay - by) < 4;
  if (sameRow) {
    const left = Math.min(ax, bx) - q;
    const right = Math.max(ax, bx) + q;
    const cy = (ay + by) * 0.5;
    const ry = Math.max(4, r * sy);
    const width = right - left + 2 * ry;
    const x = left - ry;
    const y = cy - ry;
    ctx.beginPath();
    ctx.roundRect(x, y, width, ry * 2, ry);
    return;
  }

  // Fallback smooth oriented bridge when wrapped across rows on narrow mobile
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const rx = r * 0.86;
  ctx.beginPath();
  ctx.ellipse(ax, ay, q + r, r * sy, 0, 0, Math.PI * 2);
  ctx.ellipse(bx, by, q + r, r * sy, 0, 0, Math.PI * 2);
  ctx.moveTo(ax + nx * rx, ay + ny * rx);
  ctx.lineTo(bx + nx * rx, by + ny * rx);
  ctx.lineTo(bx - nx * rx, by - ny * rx);
  ctx.lineTo(ax - nx * rx, ay - ny * rx);
  ctx.closePath();
}

function renderWaterPill(m: ManagedPill): void {
  const { canvas, ctx, state: s } = m;
  if (!ctx || s.w <= 0 || s.h <= 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pad = s.pad;
  const cw = Math.round((s.w + pad * 2) * dpr);
  const ch = Math.round((s.h + pad * 2) * dpr);
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = `${s.w + pad * 2}px`;
    canvas.style.height = `${s.h + pad * 2}px`;
  }

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, s.w + pad * 2, s.h + pad * 2);

  const dark = isDarkMode();
  const trackRadius = s.h > 52 ? 18 : s.h * 0.5;

  // Clip strictly to pill track interior for meniscus & waves
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, pad, s.w, s.h, trackRadius);
  ctx.clip();

  // Cursor meniscus highlight inside the pill track
  if (s.mouse.s > 0.01) {
    const mg = ctx.createRadialGradient(
      s.mouse.x,
      s.mouse.y,
      0,
      s.mouse.x,
      s.mouse.y,
      54
    );
    mg.addColorStop(
      0,
      dark
        ? `rgba(125, 211, 252, ${(0.22 * s.mouse.s).toFixed(3)})`
        : `rgba(255, 255, 255, ${(0.52 * s.mouse.s).toFixed(3)})`
    );
    mg.addColorStop(
      0.55,
      dark
        ? `rgba(56, 189, 248, ${(0.08 * s.mouse.s).toFixed(3)})`
        : `rgba(0, 162, 255, ${(0.14 * s.mouse.s).toFixed(3)})`
    );
    mg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = mg;
    ctx.fillRect(pad, pad, s.w, s.h);
  }

  // Expanding water wave ripples from tap / settle
  for (const r of s.rips) {
    const radius = r.age * 135 + 8;
    const fade = Math.max(0, 1 - r.age / 1.45) * r.amp;
    if (fade <= 0.01) continue;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = dark
      ? `rgba(126, 232, 255, ${(0.34 * fade).toFixed(3)})`
      : `rgba(0, 148, 255, ${(0.28 * fade).toFixed(3)})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    if (radius > 16) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius * 0.62, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.32 * fade).toFixed(3)})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  // Active water drop (dual spring lead/lag capsule + satellite droplets)
  if (s.ready) {
    const sep = Math.hypot(s.a.x - s.b.x, s.a.y - s.b.y);
    const thin = Math.min(sep / (2 * (s.q + s.t.r) || 1), 1);
    const r = s.t.r * (1 - 0.24 * thin);

    // Subtle elevation shadow beneath water drop
    ctx.save();
    ctx.shadowColor = dark ? "rgba(0, 20, 60, 0.55)" : "rgba(0, 60, 130, 0.22)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    drawCapsule(ctx, s.a.x, s.a.y, s.b.x, s.b.y, s.q, r, s.sy.s);
    ctx.fillStyle = dark ? "rgba(56, 189, 248, 0.16)" : "rgba(255, 255, 255, 0.65)";
    ctx.fill();
    ctx.restore();

    // Main translucent liquid glass body gradient
    const minY = Math.min(s.a.y, s.b.y) - r;
    const maxY = Math.max(s.a.y, s.b.y) + r;
    const bodyGrad = ctx.createLinearGradient(0, minY, 0, maxY);
    if (dark) {
      bodyGrad.addColorStop(0, "rgba(224, 244, 255, 0.28)");
      bodyGrad.addColorStop(0.5, "rgba(120, 202, 255, 0.17)");
      bodyGrad.addColorStop(1, "rgba(14, 165, 233, 0.24)");
    } else {
      bodyGrad.addColorStop(0, "rgba(255, 255, 255, 0.94)");
      bodyGrad.addColorStop(0.55, "rgba(244, 250, 255, 0.78)");
      bodyGrad.addColorStop(1, "rgba(204, 234, 255, 0.85)");
    }

    drawCapsule(ctx, s.a.x, s.a.y, s.b.x, s.b.y, s.q, r, s.sy.s);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Iridescent / aqua outer rim highlight
    ctx.strokeStyle = dark
      ? "rgba(165, 228, 255, 0.42)"
      : "rgba(255, 255, 255, 0.96)";
    ctx.lineWidth = 1.15;
    ctx.stroke();

    // Inner aqua caustic rim along bottom edge
    ctx.save();
    drawCapsule(ctx, s.a.x, s.a.y, s.b.x, s.b.y, s.q, r, s.sy.s);
    ctx.clip();
    const specGrad = ctx.createLinearGradient(0, minY, 0, minY + r * 1.1);
    specGrad.addColorStop(0, dark ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.85)");
    specGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = specGrad;
    ctx.fillRect(pad, minY, s.w, r * 1.1);

    // Subtle aqua lower meniscus tint
    const caustGrad = ctx.createLinearGradient(0, maxY - r * 0.8, 0, maxY);
    caustGrad.addColorStop(0, "rgba(0, 162, 255, 0)");
    caustGrad.addColorStop(
      1,
      dark ? "rgba(56, 189, 248, 0.25)" : "rgba(0, 162, 255, 0.22)"
    );
    ctx.fillStyle = caustGrad;
    ctx.fillRect(pad, maxY - r * 0.8, s.w, r * 0.8 + 2);
    ctx.restore();

    // Satellite droplets that break away across the neck during long jumps
    for (const d of s.sats) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = dark
        ? "rgba(180, 232, 255, 0.48)"
        : "rgba(255, 255, 255, 0.88)";
      ctx.fill();
      ctx.strokeStyle = dark
        ? "rgba(56, 189, 248, 0.55)"
        : "rgba(0, 162, 255, 0.42)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.restore();
  ctx.restore();
}

function kickPillLoop(): void {
  if (pillRaf) return;
  lastFrameTime = performance.now();
  const tick = (now: number) => {
    const dt = Math.min((now - lastFrameTime) / 1000, 1 / 30);
    lastFrameTime = now;
    const reduce = isReducedMotion();
    let anyBusy = false;

    for (const [el, m] of activePills) {
      if (!el.isConnected) {
        cleanupPill(el);
        continue;
      }
      const busy = stepWaterPill(m.state, dt, now, reduce);
      renderWaterPill(m);
      if (busy) anyBusy = true;
    }

    if (anyBusy) {
      pillRaf = requestAnimationFrame(tick);
    } else {
      pillRaf = 0;
    }
  };
  pillRaf = requestAnimationFrame(tick);
}

function measurePillTarget(m: ManagedPill): void {
  const { el, state: s } = m;
  const activeBtn =
    (el.querySelector('button[aria-pressed="true"], a[aria-current="page"]') as HTMLElement | null) ||
    (el.querySelector("button, a") as HTMLElement | null);
  if (!activeBtn) return;

  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (w <= 0 || h <= 0) return;

  const pad = s.pad;
  const bw = activeBtn.offsetWidth;
  const bh = activeBtn.offsetHeight;
  const nr = bh / 2;
  const nq = Math.max(0, bw / 2 - nr);
  const nx = pad + activeBtn.offsetLeft + bw / 2;
  const ny = pad + activeBtn.offsetTop + bh / 2;

  retargetWaterPill(s, nx, ny, nq, nr, w, h, performance.now());
  renderWaterPill(m);
  kickPillLoop();
}

function cleanupPill(el: HTMLElement): void {
  const m = activePills.get(el);
  if (!m) return;
  m.ro.disconnect();
  el.removeEventListener("pointermove", m.onMove);
  el.removeEventListener("pointerleave", m.onLeave);
  el.removeEventListener("pointerdown", m.onDown);
  el.removeEventListener("click", m.onClick);
  if (m.canvas.parentElement === el) m.canvas.remove();
  el.removeAttribute("data-wl-pill");
  activePills.delete(el);
}

function mountPill(el: HTMLElement, idx: number): void {
  if (activePills.has(el)) {
    measurePillTarget(activePills.get(el)!);
    return;
  }

  const buttons = el.querySelectorAll("button, a");
  if (buttons.length < 2) return;

  const key = resolvePillKey(
    el.id || null,
    el.dataset.waterId || null,
    el.getAttribute("aria-label"),
    el.className || "",
    idx
  );
  let state = pillStates.get(key);
  if (!state) {
    state = createWaterPillState(10);
    pillStates.set(key, state);
  }

  let canvas = el.querySelector(":scope > canvas.wl-pill-canvas") as HTMLCanvasElement | null;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "wl-pill-canvas";
    canvas.setAttribute("aria-hidden", "true");
    el.prepend(canvas);
  }

  const m: ManagedPill = {
    key,
    el,
    canvas,
    ctx: canvas.getContext("2d"),
    state,
    ro: new ResizeObserver(() => {
      if (!el.isConnected) {
        cleanupPill(el);
        return;
      }
      measurePillTarget(m);
    }),
    onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      state.mouse.x = e.clientX - r.left + state.pad;
      state.mouse.y = e.clientY - r.top + state.pad;
      state.mouse.on = true;
      kickPillLoop();
    },
    onLeave() {
      state.mouse.on = false;
      kickPillLoop();
    },
    onDown(e: PointerEvent) {
      if (isReducedMotion()) return;
      const r = el.getBoundingClientRect();
      state.rips.push({
        x: e.clientX - r.left + state.pad,
        y: e.clientY - r.top + state.pad,
        age: 0,
        amp: 0.9,
      });
      kickPillLoop();
    },
    onClick() {
      requestAnimationFrame(() => {
        if (el.isConnected) measurePillTarget(m);
      });
    },
  };

  el.setAttribute("data-wl-pill", "on");
  el.addEventListener("pointermove", m.onMove);
  el.addEventListener("pointerleave", m.onLeave);
  el.addEventListener("pointerdown", m.onDown);
  el.addEventListener("click", m.onClick);
  m.ro.observe(el);

  activePills.set(el, m);
  measurePillTarget(m);
}

export function syncWaterPills(root: ParentNode = document): void {
  // Prune detached pills first
  for (const [el] of activePills) {
    if (!el.isConnected) cleanupPill(el);
  }
  const pills = Array.from(root.querySelectorAll(PILL_SELECTOR)) as HTMLElement[];
  pills.forEach((el, idx) => mountPill(el, idx));
}

function spawnRipple(target: HTMLElement, clientX: number, clientY: number): void {
  if (isReducedMotion()) return;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  // Never inject inside replaced / SVG / void elements
  if (/^(INPUT|SELECT|TEXTAREA|SVG|IMG|CANVAS)$/.test(target.tagName)) return;

  let layer = target.querySelector(":scope > .wl-rip-layer") as HTMLElement | null;
  if (!layer) {
    layer = document.createElement("span");
    layer.className = "wl-rip-layer";
    layer.setAttribute("aria-hidden", "true");
    target.appendChild(layer);
  }

  // Keep at most 3 simultaneous ripples inside one control
  while (layer.childElementCount >= 3) {
    layer.firstElementChild?.remove();
  }

  const x = clientX > 0 ? clientX - rect.left : rect.width * 0.5;
  const y = clientY > 0 ? clientY - rect.top : rect.height * 0.5;
  const maxDist = Math.max(
    Math.hypot(x, y),
    Math.hypot(rect.width - x, y),
    Math.hypot(x, rect.height - y),
    Math.hypot(rect.width - x, rect.height - y)
  );
  const size = Math.max(44, Math.ceil(maxDist * 2.15));

  const rip = document.createElement("span");
  rip.className = "wl-rip";
  rip.style.width = `${size}px`;
  rip.style.height = `${size}px`;
  rip.style.left = `${x - size * 0.5}px`;
  rip.style.top = `${y - size * 0.5}px`;
  layer.appendChild(rip);

  const cleanup = () => rip.remove();
  rip.addEventListener("animationend", cleanup, { once: true });
  window.setTimeout(cleanup, 760);
}

function triggerIconMicroScene(target: HTMLElement): void {
  if (isReducedMotion()) return;
  const btn = target.closest(
    ".search-btn, #bell, #bg-btn, .mode-seg button, #top-new, .rail-nav, .node-toggle, .date-nav .btn"
  ) as HTMLElement | null;
  if (!btn) return;

  const fx = btn.id === "bell"
    ? "wave"
    : btn.id === "bg-btn" || btn.dataset.modeSet
      ? "spin"
      : "pop";
  const ico = (btn.querySelector("svg") as Element | null) || btn;
  ico.removeAttribute("data-wl-fx");
  void (btn.offsetWidth);
  ico.setAttribute("data-wl-fx", fx);
  window.setTimeout(() => ico.removeAttribute("data-wl-fx"), 950);
}

function updateMeniscus(): void {
  hoverRaf = 0;
  if (!pendingHoverMove) return;
  const { el, x, y } = pendingHoverMove;
  pendingHoverMove = null;
  if (!el.isConnected) return;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const px = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
  const py = Math.max(0, Math.min(100, ((y - rect.top) / rect.height) * 100));
  el.style.setProperty("--wx", `${px.toFixed(1)}%`);
  el.style.setProperty("--wy", `${py.toFixed(1)}%`);
  el.setAttribute("data-wl-hover", "1");
}

function clearHover(): void {
  if (currentHoverEl) {
    currentHoverEl.removeAttribute("data-wl-hover");
    currentHoverEl = null;
  }
}

export function initGlobalWaterline(): void {
  if (initialized || typeof document === "undefined") return;
  initialized = true;

  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse" || isReducedMotion()) return;
      const raw = e.target as HTMLElement | null;
      const host = raw?.closest?.(MENISCUS_SELECTOR) as HTMLElement | null;
      if (!host) {
        clearHover();
        return;
      }
      if (currentHoverEl && currentHoverEl !== host) {
        currentHoverEl.removeAttribute("data-wl-hover");
      }
      currentHoverEl = host;
      pendingHoverMove = { el: host, x: e.clientX, y: e.clientY };
      if (!hoverRaf) hoverRaf = requestAnimationFrame(updateMeniscus);
    },
    { passive: true }
  );

  document.addEventListener("pointerleave", clearHover, { passive: true });

  document.addEventListener(
    "pointerdown",
    (e) => {
      const raw = e.target as HTMLElement | null;
      if (!raw) return;
      // Topbar LiquidNavbar & Accordion headers handle their own WebGL ripples
      if (raw.closest(".nimbus-nav, .nf-q")) return;
      // Don't ripple disabled buttons or inside pill track handled separately unless standalone button
      const pill = raw.closest(PILL_SELECTOR);
      if (pill && raw.closest("button, a")) return;

      const target = raw.closest(RIPPLE_TARGET_SELECTOR) as HTMLElement | null;
      if (!target || target.hasAttribute("disabled")) return;
      if (target.getAttribute("aria-disabled") === "true") return;
      spawnRipple(target, e.clientX, e.clientY);
    },
    { passive: true }
  );

  document.addEventListener("click", (e) => {
    const raw = e.target as HTMLElement | null;
    if (!raw || raw.closest(".nimbus-nav")) return;
    triggerIconMicroScene(raw);
    if (raw.closest(PILL_SELECTOR)) {
      requestAnimationFrame(() => syncWaterPills(document));
    }
  });

  document.addEventListener("change", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target || !(target instanceof HTMLInputElement)) return;
    const pick = target.closest(".pick") as HTMLElement | null;
    const chip = pick?.querySelector("span") as HTMLElement | null;
    if (chip && !isReducedMotion()) {
      chip.removeAttribute("data-wl-fx");
      void chip.offsetWidth;
      chip.setAttribute("data-wl-fx", "pop");
      window.setTimeout(() => chip.removeAttribute("data-wl-fx"), 600);
    }
  });

  // Expose integration bridge for legacy Tugun modules
  const win = window as unknown as {
    __tugunWaterline?: {
      afterRender: (view?: string, deptId?: string) => void;
      syncPills: (root?: ParentNode) => void;
      syncModal: () => void;
    };
  };

  win.__tugunWaterline = {
    afterRender(viewName = "", deptId = "") {
      const routeKey = `${viewName}:${deptId || ""}`;
      const viewEl = document.getElementById("view");
      if (viewEl && routeKey && routeKey !== lastRouteKey && !isReducedMotion()) {
        lastRouteKey = routeKey;
        viewEl.setAttribute("data-wl-enter", "1");
        window.setTimeout(() => viewEl.removeAttribute("data-wl-enter"), 420);
      } else if (routeKey) {
        lastRouteKey = routeKey;
      }
      syncWaterPills(document);
    },
    syncPills(root: ParentNode = document) {
      syncWaterPills(root);
    },
    syncModal() {
      const dlg = document.getElementById("modal");
      if (dlg) syncWaterPills(dlg);
    },
  };

  syncWaterPills(document);
}
