// Supabase Edge Function: sends the e-mail reminders that are due. Runs every minute (see supabase/cron.sql).
// Secrets: RESEND_API_KEY, REMINDER_FROM (e.g. "Minha Rotina <alertas@seudominio.com>"), CRON_SECRET, APP_URL.
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
  <p style="font-size:12px;color:#8A90A0;margin-top:16px">Você recebeu este e-mail porque ativou alertas para este evento. Para parar, desligue os alertas por e-mail nas Configurações.</p>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("RESEND_API_KEY")!;
  const from = Deno.env.get("REMINDER_FROM") ?? "Minha Rotina <onboarding@resend.dev>";
  const appUrl = (Deno.env.get("APP_URL") ?? "") + "/#/calendario";

  const { data: due, error } = await supabase.rpc("due_reminders", { max_rows: 100 });
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0;
  const failed: string[] = [];
  for (const r of due ?? []) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [r.email], subject: `Lembrete: ${r.title}`, html: emailHtml(r.title, r.when_label, appUrl), text: `${r.title}\n${r.when_label}\n\n${appUrl}` }),
    });
    if (res.ok) {
      await supabase.from("reminders").update({ sent_at: new Date().toISOString() }).eq("id", r.id);
      sent++;
    } else failed.push(`${r.id}: ${res.status} ${await res.text()}`);
  }
  return Response.json({ due: due?.length ?? 0, sent, failed });
});
