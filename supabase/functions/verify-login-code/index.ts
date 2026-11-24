import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  try {
    const { identifier, code } = await req.json();

    if (!identifier || !code || String(code).trim().length !== 6) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_input",
          message: "Identifikator va 6 xonali kodni to'liq kiriting.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Bazada kodni tekshirish
    const { data: vResult, error: vError } = await supabaseAdmin.rpc("verify_login_code", {
      p_identifier: String(identifier).trim(),
      p_code: String(code).trim(),
    });

    if (vError) {
      return new Response(
        JSON.stringify({ ok: false, error: "db_error", message: "Kodni tekshirishda xatolik." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vResult || !vResult.ok) {
      if (vResult?.error === "blocked_too_many_attempts") {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "blocked",
            message: "5 marta noto'g'ri kod kiritildi. Kod bekor qilindi, yangi kod so'rang.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (vResult?.error === "wrong_code") {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "wrong_code",
            remaining: vResult.remaining,
            message: `Noto'g'ri kod. Yana ${vResult.remaining} ta urinish qoldi.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (vResult?.error === "expired_or_used") {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "expired",
            message: "Kod muddati o'tgan (5 daqiqa) yoki allaqachon ishlatilgan. Yangi kod so'rang.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_code",
          message: "Kiritilgan kod xato yoki mavjud emas.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Kod to'g'ri! Foydalanuvchi hisobini (auth.users va members) tekshiramiz yoki yaratamiz
    const staffId = vResult.staff_id;
    const orgId = vResult.org_id;
    const userEmail = `tg_${staffId}@tugun.internal`;

    let userId = vResult.user_id;

    if (!userId) {
      // Yangi auth foydalanuvchi yaratamiz
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          staff_id: staffId,
          org_id: orgId,
          full_name: vResult.full_name,
        },
      });

      if (createErr && !createErr.message.includes("already registered")) {
        return new Response(
          JSON.stringify({ ok: false, error: "auth_create_failed", message: "Hisob yaratishda xatolik." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser?.user?.id;

      if (!userId) {
        // Agar allaqachon mavjud bo'lsa, qidirib topamiz
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const found = userList?.users?.find((u) => u.email === userEmail);
        userId = found?.id;
      }

      if (userId) {
        // members jadvaliga bog'laymiz
        await supabaseAdmin.from("members").upsert({
          user_id: userId,
          org_id: orgId,
          role: vResult.role || "xodim",
          staff_id: staffId,
        });
      }
    }

    // 3. Supabase Auth Sessiyasi yaratish (MagicLink -> OTP verify)
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      return new Response(
        JSON.stringify({ ok: false, error: "session_failed", message: "Sessiya yaratib bo'lmadi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anon mijoz orqali tokenni sessiyaga aylantiramiz
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { data: sessionData, error: sessionErr } = await anonClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (sessionErr || !sessionData?.session) {
      return new Response(
        JSON.stringify({ ok: false, error: "otp_failed", message: "Sessiyani tasdiqlab bo'lmadi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sessiya va xodim ma'lumotlarini qaytaramiz
    return new Response(
      JSON.stringify({
        ok: true,
        session: sessionData.session,
        user: sessionData.user,
        staff: {
          id: staffId,
          full_name: vResult.full_name,
          role: vResult.role,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_e) {
    return new Response(
      JSON.stringify({ ok: false, error: "server_error", message: "Serverda kutilmagan xatolik." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
