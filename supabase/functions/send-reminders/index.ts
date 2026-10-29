// Supabase Edge Function: sends the reminders that are due, by e-mail or WhatsApp. Runs every minute (see supabase/cron.sql).
// Secrets: RESEND_API_KEY, REMINDER_FROM (e.g. "Minha Rotina <alertas@seudominio.com>"), CRON_SECRET, APP_URL.
// WhatsApp (optional; until it is set up, WhatsApp reminders arrive by e-mail):
//   WHATSAPP_PROVIDER = "twilio" | "meta"
//   twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. "+14155238886"),
//           TWILIO_CONTENT_SID (optional approved template with {{1}} = title and {{2}} = when)
//   meta:   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE (approved template with two body
//           variables: title and when; default "lembrete"), WHATSAPP_LANG (default "pt_BR")
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
// Daily limits per person (last 24 h), so one account can't run up the bill or message strangers:
//   DAILY_EMAIL_LIMIT (default 50), DAILY_WHATSAPP_LIMIT (default 20), DAILY_WHATSAPP_NUMBERS (default 2).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function emailHtml(title: string, when: string, appUrl: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F8FA;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1E2330">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid #E1E5EB;border-radius:14px">
  <tr><td style="padding:28px 28px 8px;font-size:13px;color:#5B6272">Lembrete do Minha Rotina</td></tr>
  <tr><td style="padding:0 28px;border-left:4px solid #1F7A8C"><div style="font-size:22px;font-weight:700;line-height:1.3">${esc(title)}</div>
  <div style="margin-top:6px;font-size:15px;color:#5B6272">${esc(when)}</div></td></tr>
  <tr><td style="padding:24px 28px 28px"><a href="${esc(appUrl)}" style="display:inline-block;background:#1F7A8C;color:#fff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:8px">Abrir o calendário</a></td></tr>
  </table>
  <p style="font-size:12px;color:#8A90A0;margin-top:16px">Você recebeu este e-mail porque ativou alertas para este item. Para parar, desligue os avisos nas Configurações.</p>
  </td></tr></table></body></html>`;
}

type Sent = { ok: true } | { ok: false; status: number; reason: string };

/** Constant-time comparison, so the secret can't be guessed from response times. */
function sameSecret(a: string, b: string) {
  const x = new TextEncoder().encode(a),
    y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
/** WhatsApp template variables can't have line breaks, tabs or long runs of spaces. */
const oneLine = (t: string) => t.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 200);
const num = (name: string, fallback: number) => Number(Deno.env.get(name)) || fallback;

async function sendEmail(to: string, title: string, when: string, appUrl: string): Promise<Sent> {
  const from = Deno.env.get("REMINDER_FROM") ?? "Minha Rotina <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: `Lembrete: ${title}`, html: emailHtml(title, when, appUrl), text: `${title}\n${when}\n\n${appUrl}` }),
  });
  return res.ok ? { ok: true } : { ok: false, status: res.status, reason: `${res.status} ${await res.text()}` };
}

const whatsappReady = () => {
  const p = Deno.env.get("WHATSAPP_PROVIDER");
  if (p === "twilio") return !!(Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN") && Deno.env.get("TWILIO_WHATSAPP_FROM"));
  if (p === "meta") return !!(Deno.env.get("WHATSAPP_TOKEN") && Deno.env.get("WHATSAPP_PHONE_ID"));
  return false;
};

async function sendWhatsApp(phone: string, title: string, when: string, appUrl: string): Promise<Sent> {
  let res: Response;
  if (Deno.env.get("WHATSAPP_PROVIDER") === "twilio") {
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const body = new URLSearchParams({ From: `whatsapp:${Deno.env.get("TWILIO_WHATSAPP_FROM")}`, To: `whatsapp:${phone}` });
    const content = Deno.env.get("TWILIO_CONTENT_SID");
    if (content) {
      body.set("ContentSid", content);
      body.set("ContentVariables", JSON.stringify({ 1: oneLine(title), 2: oneLine(when) }));
    } else body.set("Body", `⏰ Lembrete do Minha Rotina\n*${oneLine(title)}*\n${oneLine(when)}\n\n${appUrl}`);
    res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${sid}:${Deno.env.get("TWILIO_AUTH_TOKEN")}`), "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } else {
    res = await fetch(`https://graph.facebook.com/v21.0/${Deno.env.get("WHATSAPP_PHONE_ID")}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/^\+/, ""),
        type: "template",
        template: {
          name: Deno.env.get("WHATSAPP_TEMPLATE") ?? "lembrete",
          language: { code: Deno.env.get("WHATSAPP_LANG") ?? "pt_BR" },
          components: [{ type: "body", parameters: [{ type: "text", text: oneLine(title) }, { type: "text", text: oneLine(when) }] }],
        },
      }),
    });
  }
  return res.ok ? { ok: true } : { ok: false, status: res.status, reason: `WhatsApp ${res.status} ${await res.text()}` };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || !sameSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`))
    return new Response("unauthorized", { status: 401 });
  // Without the e-mail key every send would fail and the reminders would be given up on: stop here instead.
  if (!Deno.env.get("RESEND_API_KEY")) return new Response("RESEND_API_KEY is not set", { status: 500 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const appUrl = (Deno.env.get("APP_URL") ?? "") + "/#/calendario";
  let wa = whatsappReady();
  const limit = { email: num("DAILY_EMAIL_LIMIT", 50), whatsapp: num("DAILY_WHATSAPP_LIMIT", 20), numbers: num("DAILY_WHATSAPP_NUMBERS", 2) };

  const { data: due, error } = await supabase.rpc("due_reminders", { max_rows: 100 });
  if (error) return new Response(error.message, { status: 500 });

  // What each person in this batch already received today.
  const users = [...new Set((due ?? []).map((r: { user_id: string }) => r.user_id))];
  const usage = new Map<string, { email: number; whatsapp: number; phones: Set<string> }>();
  const use = (u: string) => usage.get(u) ?? (usage.set(u, { email: 0, whatsapp: 0, phones: new Set() }), usage.get(u)!);
  if (users.length) {
    const { data: rows, error: uErr } = await supabase.rpc("reminders_sent_today", { ids: users });
    if (uErr) return new Response(uErr.message, { status: 500 });
    for (const r of rows ?? []) {
      const u = use(r.user_id);
      if (r.channel === "whatsapp") {
        u.whatsapp += Number(r.sent);
        if (r.phone) u.phones.add(r.phone);
      } else u.email += Number(r.sent);
    }
  }
  const giveUp = (id: string, reason: string) =>
    supabase.from("reminders").update({ sent_at: new Date().toISOString(), last_error: reason }).eq("id", id);

  let sent = 0;
  const failed: string[] = [];
  for (const r of due ?? []) {
    const u = use(r.user_id);
    // WhatsApp only while under the daily limits; otherwise (or when not set up) the reminder goes by e-mail.
    const waOk =
      r.channel === "whatsapp" && r.phone && wa && u.whatsapp < limit.whatsapp && (u.phones.has(r.phone) || u.phones.size < limit.numbers);
    if (!waOk && u.email >= limit.email) {
      await giveUp(r.id, "daily limit reached");
      failed.push(`${r.id}: daily limit reached`);
      continue;
    }
    let viaWa = !!waOk;
    let res = viaWa ? await sendWhatsApp(r.phone, r.title, r.when_label, appUrl) : await sendEmail(r.email, r.title, r.when_label, appUrl);
    if (viaWa && !res.ok && (res.status === 401 || res.status === 403)) {
      // WhatsApp keys are wrong: stop using WhatsApp in this run and deliver by e-mail instead.
      failed.push(`${r.id}: ${res.reason}`);
      wa = false;
      viaWa = false;
      res = await sendEmail(r.email, r.title, r.when_label, appUrl);
    }
    if (res.ok) {
      await supabase.from("reminders").update({ sent_at: new Date().toISOString() }).eq("id", r.id);
      if (viaWa) {
        u.whatsapp++;
        u.phones.add(r.phone);
      } else u.email++;
      sent++;
      continue;
    }
    failed.push(`${r.id}: ${res.reason}`);
    // 401/403 mean a wrong or missing key on our side: keep the reminder and try again next minute.
    // Other 4xx (except rate limits) will fail the same way every time: give up on this one.
    if (res.status === 401 || res.status === 403) break;
    if (res.status >= 400 && res.status < 500 && res.status !== 429) await giveUp(r.id, res.reason.slice(0, 500));
  }
  return Response.json({ due: due?.length ?? 0, sent, failed });
});
