"use client";
import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Send, ShieldCheck } from "lucide-react";
import { sb } from "@/supabase";

// Vertex shader source code
const vertexSmokeySource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// Fragment shader source code for the smokey background effect
const fragmentSmokeySource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord / iResolution;
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    float time = iTime * 0.5;

    // Normalize mouse input (0.0 - 1.0) and remap to -1.0 ~ 1.0
    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;

    vec2 distortion = centeredUV;
    // Apply distortion for a wavy, smokey effect
    for (float i = 1.0; i < 8.0; i++) {
        distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
        distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
    }

    // Create a glowing wave pattern
    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.9, 0.2, wave);

    fragColor = vec4(u_color * glow, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

type BlurSize = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

interface SmokeyBackgroundProps {
  backdropBlurAmount?: string;
  color?: string;
  className?: string;
}

const blurClassMap: Record<BlurSize, string> = {
  none: "backdrop-blur-none",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
  "2xl": "backdrop-blur-2xl",
  "3xl": "backdrop-blur-3xl",
};

export function SmokeyBackground({
  backdropBlurAmount = "sm",
  color = "#1E40AF",
  className = "",
}: SmokeyBackgroundProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;
    return [r, g, b];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSmokeySource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSmokeySource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const iMouseLocation = gl.getUniformLocation(program, "iMouse");
    const uColorLocation = gl.getUniformLocation(program, "u_color");

    let startTime = Date.now();
    const [r, g, b] = hexToRgb(color);
    gl.uniform3f(uColorLocation, r, g, b);

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);

      const currentTime = (Date.now() - startTime) / 1000;

      gl.uniform2f(iResolutionLocation, width, height);
      gl.uniform1f(iTimeLocation, currentTime);
      gl.uniform2f(iMouseLocation, isHovering ? mousePosition.x : width / 2, isHovering ? height - mousePosition.y : height / 2);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setMousePosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    render();

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isHovering, mousePosition, color]);

  const finalBlurClass = blurClassMap[backdropBlurAmount as BlurSize] || blurClassMap["sm"];

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className={`absolute inset-0 ${finalBlurClass}`}></div>
    </div>
  );
}

export function LoginForm() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setHasSession(Boolean(data?.session))).catch(() => {});
  }, []);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const cleanCode = code.replace(/[^0-9]/g, "").trim();
    if (cleanCode.length !== 6) {
      setErrorMsg("Bot bergan 6 xonali kodni to'liq kiriting.");
      return;
    }

    setLoading(true);
    try {
      if (!sb) {
        setErrorMsg("Supabase ulanmagan.");
        return;
      }

      const { data, error } = await sb.functions.invoke("verify-login-code", {
        body: { code: cleanCode },
      });

      if (error || !data || data.ok === false) {
        setErrorMsg(data?.message || "Kod noto'g'ri yoki muddati o'tgan. Botdan yangi kod oling.");
        return;
      }

      if (data.session) {
        await sb.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        window.location.hash = "#tuzilma";
        window.location.reload();
      }
    } catch (_err) {
      setErrorMsg("Kodni tekshirishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white">Xush kelibsiz</h2>
        <p className="mt-2 text-sm text-gray-300">Tugun — BARAKA LES jamoasi</p>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-center animate-fade-in">
          {errorMsg}
        </div>
      )}

      {infoMsg && (
        <div className="p-3 text-xs rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-200 text-center animate-fade-in">
          {infoMsg}
        </div>
      )}

      <div className="space-y-3">
        <a
          href="https://t.me/tugunuzbot?start=login"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#229ED9] hover:bg-[#1E88E5] rounded-lg text-white font-semibold transition-all duration-300 shadow-md"
        >
          <Send className="h-4 w-4" />
          Telegram botdan kod olish
        </a>
        <p className="text-xs text-gray-300 text-center leading-relaxed">
          Tugmani bosib <b className="text-white">@tugunuzbot</b> ga kiring va <b>Start</b> bosing — bot sizga bir martalik 6 xonali kod yuboradi.
        </p>
      </div>

      <form className="space-y-5 pt-1" onSubmit={handleVerifyCode}>
        <div className="relative z-0 mt-2 text-center">
          <input
            type="text"
            inputMode="numeric"
            id="floating_code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            className="block py-2.5 px-0 w-full text-center tracking-[0.5em] text-2xl font-mono text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-[#229ED9] peer"
            placeholder=" "
            required
          />
          <label
            htmlFor="floating_code"
            className="pointer-events-none absolute left-0 text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-[#229ED9] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            <ShieldCheck className="inline-block mr-2 -mt-1" size={16} />
            Bot bergan 6 xonali kod
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full flex items-center justify-center py-2.5 px-4 bg-[#229ED9] hover:bg-[#1E88E5] rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-[#229ED9] transition-all duration-300 shadow-md disabled:opacity-50"
        >
          {loading ? "Tekshirilmoqda..." : "Tasdiqlash va kirish"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </form>

      {hasSession && (
        <div className="flex items-center justify-between pt-1 text-xs">
          <a href="#tuzilma" className="text-gray-400 hover:text-white transition">
            ← Ilovaga qaytish
          </a>
          <button
            type="button"
            onClick={async () => {
              if (sb) await sb.auth.signOut();
              setHasSession(false);
            }}
            className="text-red-300 hover:text-red-200 transition"
          >
            Hisobdan chiqish
          </button>
        </div>
      )}
    </div>
  );
}
