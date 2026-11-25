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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = await req.json();
    const message = update?.message;
    if (!message || !message.chat?.id) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat.id;
    const text = (message.text || "").trim();
    const username = message.from?.username || null;
    const firstName = message.from?.first_name || "Foydalanuvchi";
    const fullName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || firstName;

    const adminHeaders = {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    };

    // Agar rahbar bergan maxsus taklif havolasi (/start <TOKEN>) bo'lsa, avval uni bog'laymiz
    const startMatch = text.match(/^\/start(?:\s+([a-zA-Z0-9_-]+))?$/);
    if (startMatch && startMatch[1] && startMatch[1] !== "login") {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_telegram_invite`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          p_token: startMatch[1],
          p_chat_id: chatId,
          p_username: username,
        }),
      }).catch(() => {});
    }

    // Har qanday /start yoki xabarda foydalanuvchiga bir martalik 6 xonali kirish kodi beramiz
    const otpRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/issue_telegram_bot_otp`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        p_chat_id: chatId,
        p_username: username,
        p_full_name: fullName,
      }),
    });

    const otpData = otpRes.ok ? await otpRes.json() : null;

    if (otpData?.ok && otpData?.code) {
      await sendTelegramMessage(
        chatId,
        `Assalomu alaykum, ${fullName}!\n\nSaytga kirish uchun bir martalik kodingiz:\n\n${otpData.code}\n\nKod 5 daqiqa amal qiladi. Uni saytdagi kirish oynasiga kiriting.`
      );
    } else if (otpData?.error === "rate_limit") {
      await sendTelegramMessage(
        chatId,
        `Iltimos, ${otpData.wait_sec || 10} soniya kutib qayta /start bosing.`
      );
    } else if (otpData?.error === "hour_limit_exceeded") {
      await sendTelegramMessage(
        chatId,
        "Bir soat ichida juda ko'p kod so'radingiz. Birozdan so'ng urinib ko'ring."
      );
    } else {
      await sendTelegramMessage(
        chatId,
        "Kodni yaratishda vaqtinchalik xatolik yuz berdi. Birozdan so'ng qayta /start bosing."
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
