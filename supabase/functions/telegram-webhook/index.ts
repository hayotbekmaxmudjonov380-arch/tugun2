import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!BOT_TOKEN) return { ok: false, error: "no_bot_token" };
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return res.json();
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Telegram webhook maxfiy sarlavhasini tekshirish
  const secretHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = await req.json();
    const message = update?.message;
    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat?.id;
    const text = message.text.trim();
    const username = message.from?.username || null;
    const firstName = message.from?.first_name || "Foydalanuvchi";

    // Faqat /start <TOKEN> buyrug'ini qabul qilamiz
    const startMatch = text.match(/^\/start(?:\s+([a-zA-Z0-9_-]+))?$/);
    if (!startMatch || !startMatch[1]) {
      await sendTelegramMessage(
        chatId,
        `Assalomu alaykum, ${firstName}!\n\nBu — Tugun (BARAKA LES) jamoaviy boshqaruv tizimi rasmiy boti.\n\nHisobingizni tizimga ulash uchun rahbardan olingan maxsus taklif havolasi orqali bosing.`
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = startMatch[1];
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Taklif tokenini tekshirish va xodim kartasiga bog'lash
    const { data, error } = await supabase.rpc("claim_telegram_invite", {
      p_token: token,
      p_chat_id: chatId,
      p_username: username,
    });

    if (error || !data || !data.ok) {
      await sendTelegramMessage(
        chatId,
        "Ushbu taklif havolasi yaroqsiz yoki muddati o'tgan (24 soat). Iltimos, rahbardan yangi havola oling."
      );
    } else {
      await sendTelegramMessage(
        chatId,
        `Ulandingiz, ${data.full_name || firstName}.\n\nEndi saytdan Telegram orqali xavfsiz kirishingiz mumkin.`
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
