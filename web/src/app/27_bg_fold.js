/* ================= interactive GradFlow Fold background ================= */
const FOLD_PALETTE = {
  // Exact GradFlow Fold config from reference: #1e3cc8, #06081e, #96d7ff, speed 0.5, scale 1, noise 0.12
  night: {
    c1: [0.118, 0.235, 0.784], // #1e3cc8
    c2: [0.024, 0.031, 0.118], // #06081e
    c3: [0.588, 0.843, 1.000], // #96d7ff
    noise: 0.12
  },
  // Luminous Day Liquid Glass adaptation keeping dark --ink crisp
  day: {
    c1: [0.365, 0.545, 0.945], // airy cobalt
    c2: [0.835, 0.878, 0.955], // cool frosted mist
    c3: [0.975, 0.992, 1.000], // luminous ice crest
    noise: 0.075
  }
};

function startFoldBg() {
  const canvas = document.getElementById("bg-fold");
  if (!canvas) return null;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFoldActive = () => (document.documentElement.getAttribute("data-bg") || "fold") === "fold";
  const isDarkMode = () => getComputedStyle(document.documentElement).getPropertyValue("--wave-mode").trim() === "dark";

  // Smooth interactive cursor state (normalized [-1..1] + aspect UV)
  const mouse = { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0, active: false };
  const onPointerMove = e => {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    const nx = (e.clientX / w) * 2 - 1;
    const ny = 1 - (e.clientY / h) * 2; // Y-up in shader space
    mouse.tx = Math.max(-1.25, Math.min(1.25, nx));
    mouse.ty = Math.max(-1.25, Math.min(1.25, ny));
    mouse.active = true;
  };
  const onTouchMove = e => {
    if (e.touches && e.touches[0]) onPointerMove(e.touches[0]);
  };
  const onPointerLeave = () => {
    mouse.active = false;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("pointerleave", onPointerLeave, { passive: true });

  const vsSrc = `
    attribute vec2 a_pos;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const fsSrc = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform vec2 u_vel;
    uniform vec3 u_c1;
    uniform vec3 u_c2;
    uniform vec3 u_c3;
    uniform float u_noise;
    uniform float u_dark;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Smooth folded sheet layer: returns vec2(litBody, sharpCreaseGlow)
    vec2 foldLayer(vec2 p, float freq, float phase, float sharpness) {
      float s = sin(p.x * freq + p.y * 0.45 + phase);
      float c = cos(p.x * freq + p.y * 0.45 + phase);
      // Asymmetric falloff across each fold ridge (rich blue on one side, deep shadow on other)
      float asym = s * 0.65 + (1.0 - c) * 0.25;
      float body = smoothstep(-0.65, 0.85, asym);
      // Sharp luminous caustic crest along the fold crease
      float crease = exp(-abs(s) * sharpness);
      return vec2(body, crease);
    }

    void main() {
      float minDim = max(1.0, min(u_res.x, u_res.y));
      vec2 aspect = u_res / minDim;
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / minDim;

      // Cursor in same aspect-corrected coordinate space
      vec2 mUv = u_mouse * 0.5 * aspect;
      vec2 delta = uv - mUv;
      float mDist = length(delta);

      // Interactive cursor fluid lens warp + smooth global parallax tilt
      vec2 lens = delta * exp(-mDist * mDist * 1.35) * 0.30;
      vec2 p = uv * 1.0 + vec2(u_mouse.x * 0.24, u_mouse.y * 0.20) - lens + u_vel * 0.18;

      // Diagonal sweep rotation matching GradFlow Fold composition
      mat2 rot = mat2(0.8387, -0.5446, 0.5446, 0.8387);
      vec2 q = rot * p;

      float t = u_time * 0.5; // speed: 0.5

      // Multi-stage organic domain warp so folds curve & intersect gracefully
      vec2 w = q;
      w.x += 0.34 * sin(q.y * 1.35 + t * 0.52 + u_mouse.x * 0.55);
      w.y += 0.28 * cos(q.x * 1.15 - t * 0.41 + u_mouse.y * 0.55);
      w.x += 0.12 * sin(w.y * 2.15 - t * 0.64);
      w.y += 0.12 * cos(w.x * 1.95 + t * 0.48);

      // 4 sweeping folded ribbons creating overlapping caustic arcs
      vec2 f1 = foldLayer(vec2(w.x + 0.32 * sin(w.y * 1.45 + t * 0.38), w.y), 1.65, t * 0.45 + u_mouse.x * 0.40, 8.8);
      vec2 f2 = foldLayer(vec2(w.x * 0.72 - w.y * 0.88 + 0.42 * cos(w.x * 1.2 - t * 0.33), w.x), 1.45, 1.85 - t * 0.36 + u_mouse.y * 0.45, 9.6);
      vec2 f3 = foldLayer(vec2(w.x * 0.88 + w.y * 0.52 + 0.28 * sin(w.y * 1.8 + t * 0.58), w.y), 2.10, 3.40 + t * 0.54 - u_mouse.x * 0.30, 11.2);
      vec2 f4 = foldLayer(vec2(w.y * 0.95 - w.x * 0.32 + 0.30 * cos(w.x * 0.95 + t * 0.29), w.x), 1.25, -0.90 + t * 0.28 + u_mouse.y * 0.32, 8.2);

      // Combine ribbon bodies and glowing crests
      float bodyMix = clamp(f1.x * 0.42 + f2.x * 0.34 + f3.x * 0.26 + f4.x * 0.24, 0.0, 1.0);
      float crest = clamp(f1.y * 0.66 + f2.y * 0.60 + f3.y * 0.50 + f4.y * 0.38, 0.0, 1.35);

      // Soft ambient light halo tracking the cursor
      float cursorGlow = exp(-mDist * mDist * 2.4) * 0.14;
      crest += cursorGlow * (0.45 + 0.55 * bodyMix);

      // Compose base -> cobalt fold -> luminous cyan crest
      vec3 col = mix(u_c2, u_c1, pow(bodyMix, u_dark > 0.5 ? 1.15 : 1.05));
      float halo = smoothstep(0.05, 0.75, crest);
      col = mix(col, u_c1 * 1.18 + u_c3 * 0.22, halo * (u_dark > 0.5 ? 0.55 : 0.38));

      // Crisp luminous ridge highlight (additive-like screen blend)
      float edge = pow(clamp(crest, 0.0, 1.0), u_dark > 0.5 ? 1.45 : 1.35);
      col = mix(col, u_c3, clamp(edge * (u_dark > 0.5 ? 0.88 : 0.82), 0.0, 1.0));

      // Intersection core sparkle where two fold crests cross
      float crossBoost = clamp((f1.y * f2.y + f2.y * f3.y + f1.y * f3.y) * 1.4, 0.0, 0.55);
      col += mix(u_c3, vec3(1.0), 0.55) * crossBoost * (u_dark > 0.5 ? 0.42 : 0.22);

      // Subtle vignette in night mode to deepen midnight corners (#06081e)
      if (u_dark > 0.5) {
        float vig = smoothstep(1.55, 0.35, length(uv));
        col = mix(u_c2 * 0.85, col, 0.72 + 0.28 * vig);
      }

      // Film grain / dithering matching GradFlow noise: 0.12
      float grain = hash12(gl_FragCoord.xy + fract(u_time * 1.7) * 256.0) - 0.5;
      col += grain * (u_noise * 0.24);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  let gl = null;
  let prog = null;
  let uniforms = null;
  let ctx2d = null;

  function initWebGL() {
    try {
      const opts = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: "high-performance" };
      gl = canvas.getContext("webgl2", opts) || canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
      if (!gl) return false;

      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          gl.deleteShader(s);
          return null;
        }
        return s;
      };
      const vs = compile(gl.VERTEX_SHADER, vsSrc);
      const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
      if (!vs || !fs) return false;

      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      uniforms = {
        res: gl.getUniformLocation(prog, "u_res"),
        time: gl.getUniformLocation(prog, "u_time"),
        mouse: gl.getUniformLocation(prog, "u_mouse"),
        vel: gl.getUniformLocation(prog, "u_vel"),
        c1: gl.getUniformLocation(prog, "u_c1"),
        c2: gl.getUniformLocation(prog, "u_c2"),
        c3: gl.getUniformLocation(prog, "u_c3"),
        noise: gl.getUniformLocation(prog, "u_noise"),
        dark: gl.getUniformLocation(prog, "u_dark")
      };
      return true;
    } catch (e) {
      gl = null;
      return false;
    }
  }

  const hasGL = initWebGL();
  if (!hasGL) {
    ctx2d = canvas.getContext("2d");
  }

  let W = 0, H = 0, running = false, rafId = 0, lastT = 0;

  function resize() {
    const dpr = hasGL ? Math.min(window.devicePixelRatio || 1, 1.5) : 0.75;
    W = window.innerWidth || 1;
    H = window.innerHeight || 1;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    else if (ctx2d) ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stepMouse(dt, sec) {
    // Gentle figure-8 idle drift when cursor is outside or untouched
    const gx = mouse.active ? mouse.tx : Math.sin(sec * 0.25) * 0.18;
    const gy = mouse.active ? mouse.ty : Math.cos(sec * 0.20) * 0.14;
    const k = 1 - Math.exp(-dt * 6.5);
    const nx = mouse.x + (gx - mouse.x) * k;
    const ny = mouse.y + (gy - mouse.y) * k;
    const kv = 1 - Math.exp(-dt * 8.0);
    mouse.vx += ((nx - mouse.x) * 4.0 - mouse.vx) * kv;
    mouse.vy += ((ny - mouse.y) * 4.0 - mouse.vy) * kv;
    mouse.x = nx;
    mouse.y = ny;
  }

  function draw2DFallback(sec) {
    if (!ctx2d) return;
    const dark = isDarkMode();
    const g = ctx2d.createLinearGradient(0, 0, W, H);
    if (dark) {
      g.addColorStop(0, "#06081e");
      g.addColorStop(0.5, "#12247a");
      g.addColorStop(1, "#06081e");
    } else {
      g.addColorStop(0, "#d5e0f4");
      g.addColorStop(0.5, "#7ea3ef");
      g.addColorStop(1, "#cfdcf3");
    }
    ctx2d.fillStyle = g;
    ctx2d.fillRect(0, 0, W, H);

    const mx = mouse.x * 70;
    const my = -mouse.y * 55;
    for (let i = 0; i < 4; i++) {
      ctx2d.beginPath();
      const ox = (i - 1.5) * W * 0.22 + mx * (0.6 + i * 0.18);
      for (let y = -40; y <= H + 40; y += 28) {
        const p = y / H;
        const x = W * 0.5 + ox + Math.sin(p * 3.1 + sec * 0.5 + i * 1.4) * (W * 0.14) - p * (W * 0.28) + my * Math.sin(p * Math.PI) * 0.6;
        if (y === -40) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
      }
      ctx2d.strokeStyle = dark ? "rgba(150, 215, 255, 0.32)" : "rgba(255, 255, 255, 0.65)";
      ctx2d.lineWidth = 3;
      ctx2d.shadowColor = dark ? "#96d7ff" : "#5e8df2";
      ctx2d.shadowBlur = 24;
      ctx2d.stroke();
    }
    ctx2d.shadowBlur = 0;
  }

  function renderFrame(now) {
    if (!isFoldActive()) return;
    const sec = now * 0.001;
    const dt = lastT ? Math.min(0.05, Math.max(0.001, (now - lastT) * 0.001)) : 0.016;
    lastT = now;
    stepMouse(dt, sec);

    if (gl && prog && uniforms) {
      const dark = isDarkMode();
      const pal = dark ? FOLD_PALETTE.night : FOLD_PALETTE.day;
      gl.useProgram(prog);
      gl.uniform2f(uniforms.res, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, sec);
      gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
      gl.uniform2f(uniforms.vel, mouse.vx, mouse.vy);
      gl.uniform3fv(uniforms.c1, pal.c1);
      gl.uniform3fv(uniforms.c2, pal.c2);
      gl.uniform3fv(uniforms.c3, pal.c3);
      gl.uniform1f(uniforms.noise, pal.noise);
      gl.uniform1f(uniforms.dark, dark ? 1.0 : 0.0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      draw2DFallback(sec);
    }
  }

  function loop(now) {
    if (!isFoldActive() || document.hidden || reduce) {
      running = false;
      rafId = 0;
      return;
    }
    renderFrame(now);
    rafId = requestAnimationFrame(loop);
  }

  function sync() {
    const active = isFoldActive();
    canvas.hidden = !active;
    if (!active) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      running = false;
      return;
    }
    resize();
    renderFrame(performance.now());
    if (!reduce && !running && !document.hidden) {
      running = true;
      lastT = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  resize();
  sync();
  window.addEventListener("resize", () => { if (isFoldActive()) { resize(); renderFrame(performance.now()); } }, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", sync); } catch (e) {}
  try { new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode", "data-bg"] }); } catch (e) {}
  return { sync };
}
