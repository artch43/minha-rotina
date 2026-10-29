// Supabase Edge Function: sends the reminders that are due, by e-mail or WhatsApp. Runs every minute (see supabase/cron.sql).
// Secrets: RESEND_API_KEY, REMINDER_FROM (e.g. "Minha Rotina <alertas@seudominio.com>"), CRON_SECRET, APP_URL.
// WhatsApp (optional; until it is set up, WhatsApp reminders arrive by e-mail):
//   WHATSAPP_PROVIDER = "twilio" | "meta"
//   twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. "+14155238886"),
//           TWILIO_CONTENT_SID (optional approved template with {{1}} = title and {{2}} = when)
//   meta:   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE (approved template with two body
//           variables: title and when; default "lembrete"), WHATSAPP_LANG (default "pt_BR")
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
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
      body.set("ContentVariables", JSON.stringify({ 1: title, 2: when }));
    } else body.set("Body", `⏰ Lembrete do Minha Rotina\n*${title}*\n${when}\n\n${appUrl}`);
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
          components: [{ type: "body", parameters: [{ type: "text", text: title }, { type: "text", text: when }] }],
        },
      }),
    });
  }
  return res.ok ? { ok: true } : { ok: false, status: res.status, reason: `WhatsApp ${res.status} ${await res.text()}` };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const appUrl = (Deno.env.get("APP_URL") ?? "") + "/#/calendario";
  const wa = whatsappReady();

  const { data: due, error } = await supabase.rpc("due_reminders", { max_rows: 100 });
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  const failed: string[] = [];
  for (const r of due ?? []) {
    const byWhatsApp = r.channel === "whatsapp" && r.phone && wa;
    const res = byWhatsApp ? await sendWhatsApp(r.phone, r.title, r.when_label, appUrl) : await sendEmail(r.email, r.title, r.when_label, appUrl);
    if (res.ok) {
      await supabase.from("reminders").update({ sent_at: new Date().toISOString() }).eq("id", r.id);
      sent++;
    } else {
      failed.push(`${r.id}: ${res.reason}`);
      // 4xx (except rate limits) will fail the same way next minute: give up on this one.
      if (res.status >= 400 && res.status < 500 && res.status !== 429)
        await supabase.from("reminders").update({ sent_at: new Date().toISOString(), last_error: res.reason.slice(0, 500) }).eq("id", r.id);
    }
  }
  return Response.json({ due: due?.length ?? 0, sent, failed });
});
