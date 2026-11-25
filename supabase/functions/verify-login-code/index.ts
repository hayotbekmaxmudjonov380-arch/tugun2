const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
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
    const { code } = await req.json();
    const cleanCode = String(code || "").replace(/[^0-9]/g, "");

    if (cleanCode.length !== 6) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_input",
          message: "Bot bergan 6 xonali kodni to'liq kiriting.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminHeaders = {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    };

    // 1. Bazada bot bergan bir martalik kodni tekshirish
    const vRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_telegram_bot_otp`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ p_code: cleanCode }),
    });

    if (!vRes.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: "db_error", message: "Kodni tekshirishda xatolik." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vResult = await vRes.json();

    if (!vResult || !vResult.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_or_expired",
          message: "Kod noto'g'ri, muddati o'tgan yoki allaqachon ishlatilgan. Botdan yangi kod oling.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Foydalanuvchini Supabase Auth'da topish yoki avtomatik ro'yxatdan o'tkazish
    const chatId = vResult.chat_id;
    const staffId = vResult.staff_id || null;
    const orgId = vResult.org_id || null;
    let userEmail = staffId ? `tg_${staffId}@tugun.internal` : `tg_chat_${chatId}@tugun.internal`;
    let userId = vResult.user_id || null;

    if (userId) {
      const uRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        headers: adminHeaders,
      });
      if (uRes.ok) {
        const uData = await uRes.json().catch(() => ({}));
        if (uData?.email) {
          userEmail = uData.email;
        }
      }
    } else {
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          email: userEmail,
          email_confirm: true,
          user_metadata: {
            telegram_chat_id: chatId,
            telegram_username: vResult.username || null,
            full_name: vResult.full_name || "Foydalanuvchi",
            ...(staffId ? { staff_id: staffId } : {}),
            ...(orgId ? { org_id: orgId } : {}),
          },
        }),
      });

      const createBody = await createRes.json().catch(() => ({}));
      if (!createRes.ok && !String(createBody?.msg || createBody?.message || "").includes("already")) {
        return new Response(
          JSON.stringify({ ok: false, error: "auth_create_failed", message: "Hisob yaratishda xatolik." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = createBody?.id || createBody?.user?.id || null;

      if (userId && staffId && orgId) {
        await fetch(`${SUPABASE_URL}/rest/v1/members?on_conflict=user_id,org_id`, {
          method: "POST",
          headers: { ...adminHeaders, Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            user_id: userId,
            org_id: orgId,
            role: vResult.role || "xodim",
            staff_id: staffId,
          }),
        });
      }
    }

    // 3. Supabase Auth sessiyasini yaratish
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        type: "magiclink",
        email: userEmail,
      }),
    });

    const linkData = await linkRes.json().catch(() => ({}));
    const hashedToken = linkData?.hashed_token || linkData?.properties?.hashed_token;

    if (!linkRes.ok || !hashedToken) {
      return new Response(
        JSON.stringify({ ok: false, error: "session_failed", message: "Sessiya yaratib bo'lmadi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        token_hash: hashedToken,
        type: "magiclink",
      }),
    });

    const sessionData = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !sessionData?.access_token) {
      return new Response(
        JSON.stringify({ ok: false, error: "otp_failed", message: "Sessiyani tasdiqlab bo'lmadi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        session: {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
          expires_in: sessionData.expires_in,
          token_type: sessionData.token_type,
        },
        user: sessionData.user,
        profile: {
          chat_id: chatId,
          username: vResult.username || null,
          full_name: vResult.full_name,
          role: vResult.role || "xodim",
          staff_id: staffId,
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
