import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Oddiy xotira darajasidagi IP rate-limit (Deno instansiyasida)
const ipAttempts = new Map<string, { count: number; firstAt: number }>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipAttempts.get(ip);
  if (!record || now - record.firstAt > 60000) {
    ipAttempts.set(ip, { count: 1, firstAt: now });
    return true;
  }
  if (record.count >= 20) {
    return false; // 1 daqiqada 20 dan ortiq so'rov taqiqlanadi
  }
  record.count++;
  return true;
}

async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return { ok: false, description: "no_bot_token" };
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  if (!checkIpRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "rate_limit",
        message: "Juda ko'p so'rov yuborildi. Iltimos, bir daqiqadan so'ng qayta urining.",
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { identifier } = await req.json();
    if (!identifier || typeof identifier !== "string" || identifier.trim().length < 3) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_identifier",
          message: "Telefon raqami yoki xodim identifikatorini to'g'ri kiriting.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("create_login_code", {
      p_identifier: identifier.trim(),
    });

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: "db_error", message: "Tizim xatosi yuz berdi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate-limit xatosi
    if (data?.error === "rate_limit") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "rate_limit",
          wait_sec: data.wait_sec || 60,
          message: `Kodni qayta so'rash uchun ${data.wait_sec || 60} soniya kuting.`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (data?.error === "hour_limit_exceeded") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "hour_limit_exceeded",
          message: "Bir soat ichida kod so'rash chegarasidan oshdingiz (5 ta). Keyinroq urinib ko'ring.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Agar xodim topilgan va kod navbatga qo'yilgan bo'lsa
    if (data?.queued && data?.chat_id && data?.code) {
      const tgText = `Tugun: kirish kodingiz ${data.code}. 5 daqiqa amal qiladi. Kodni hech kimga bermang.`;
      const tgRes = await sendTelegramMessage(data.chat_id, tgText);

      if (!tgRes.ok) {
        if (tgRes.error_code === 403 || tgRes.description?.includes("blocked")) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "bot_blocked",
              message: "Siz @tugunuzbot ni bloklagansiz. Iltimos, Telegram'da botga kirib /start bosing.",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            ok: false,
            error: "telegram_error",
            message: "Telegram orqali xabar yuborib bo'lmadi. Bot faolligini tekshiring.",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Foydalanuvchi bor yoki yo'qligini bildirmaslik uchun har doim bir xil umumiy xabar qaytariladi
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Agar hisobingiz Telegram botga ulangan bo'lsa, kirish kodi yuborildi.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_e) {
    return new Response(
      JSON.stringify({ ok: false, error: "server_error", message: "Serverda xatolik yuz berdi." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
