import { useEffect, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { clearAuthLink, supabase } from "@/lib/supabase";
import { clearFailures, fmtWait, recordFailure, triesLeft, waitLeft } from "@/lib/loginLimit";
import { seedAccount, useSync } from "@/lib/sync";
import { template } from "@/lib/template";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Logo } from "./app/AppSidebar";
import { isNativeApp, SITE_URL } from "@/lib/native";
import { passwordProblem } from "@/lib/password";
import { PasswordRules } from "./PasswordRules";

export type Mode = "signin" | "signup" | "forgot";

const ERRORS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail pelo link que enviamos antes de entrar.",
  "User already registered": "Já existe uma conta com este e-mail. Entre ou use “Esqueci a senha”.",
  "Signups not allowed for this instance": "Os cadastros estão fechados no momento.",
};
function msgOf(e: { message?: string; name?: string } | null) {
  if (!e) return "";
  const m = e.message ?? "";
  if (ERRORS[m]) return ERRORS[m];
  if (/fetch|network/i.test(m) || e.name === "AuthRetryableFetchError")
    return "Não foi possível conectar ao servidor. Verifique sua internet.";
  // The e-mail service refused to send (address not allowed or too many e-mails in the last hour).
  if (/email address not authorized|email rate limit|error sending|sending (confirmation|recovery)/i.test(m))
    return "Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.";
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(m)) return "Confira o e-mail: ele parece inválido.";
  if (/password/i.test(m)) return "Escolha uma senha mais forte: pelo menos 8 caracteres, com números.";
  if (/rate limit/i.test(m)) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  return "Algo deu errado. Tente de novo em instantes.";
}

/** The brand side of the sign-in screen: a week of colored bars (the logo, grown up) and a glimpse of an organized day. */
function BrandPanel() {
  const week = [
    { d: "seg", h: 62, c: "bg-area-coral" },
    { d: "ter", h: 84, c: "bg-area-amber" },
    { d: "qua", h: 48, c: "bg-area-violet" },
    { d: "qui", h: 96, c: "bg-area-sky" },
    { d: "sex", h: 70, c: "bg-area-green" },
    { d: "sáb", h: 38, c: "bg-area-pink" },
    { d: "dom", h: 54, c: "bg-area-coral" },
  ];
  const day = [
    { t: "08:00", title: "Revisar funções do 2º grau", sub: "📚 Estudos", c: "var(--area-violet)" },
    { t: "10:30", title: "Reunião com a equipe", sub: "💼 Trabalho", c: "var(--area-sky)" },
    { t: "18:00", title: "Academia", sub: "🏃 Pessoal", c: "var(--area-coral)" },
  ];
  return (
    <aside
      aria-hidden="true"
      className="auth-panel relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14"
    >
      <div className="flex items-center gap-3 text-xl font-extrabold tracking-tight">
        <Logo />
        Organizer
      </div>
      <div className="flex flex-col gap-10">
        <h2 className="max-w-md text-5xl leading-[1.05] font-extrabold tracking-tight text-balance xl:text-6xl">
          Seu dia inteiro, num lugar só.
        </h2>
        <div className="flex items-end gap-3">
          {week.map((w, i) => (
            <div key={w.d} className="flex flex-1 flex-col items-center gap-2">
              <span
                className={`auth-bar w-full max-w-5 rounded-full ${w.c}`}
                style={{ height: w.h, animationDelay: `${i * 70}ms` }}
              />
              <span className="text-xs font-medium text-white/60">{w.d}</span>
            </div>
          ))}
        </div>
        <div className="auth-card flex max-w-md flex-col gap-2 rounded-2xl bg-white p-4 text-[#1e2330] shadow-2xl">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-sm font-bold">Hoje</span>
            <span className="text-xs text-[#5b6272]">🔥 12 dias lendo</span>
          </div>
          {day.map((r) => (
            <div key={r.t} className="relative flex items-center gap-3 rounded-xl border border-[#e3e7ec] py-2.5 pr-3 pl-5">
              <span className="absolute top-2 bottom-2 left-0 w-[5px] rounded-full" style={{ background: r.c }} />
              <span className="w-11 text-sm font-semibold tabular-nums">{r.t}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{r.title}</span>
                <span className="text-xs text-[#5b6272]">{r.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-white/70">Tarefas, calendário, hábitos e anotações, com avisos no e-mail ou no WhatsApp.</p>
    </aside>
  );
}

/** Phones and tablets: the brand in a compact band on top (the big panel only fits on wide screens). */
function BrandBand() {
  const bars = [
    { h: 26, c: "bg-area-coral" },
    { h: 36, c: "bg-area-amber" },
    { h: 20, c: "bg-area-violet" },
    { h: 42, c: "bg-area-sky" },
    { h: 30, c: "bg-area-green" },
    { h: 16, c: "bg-area-pink" },
    { h: 24, c: "bg-area-coral" },
  ];
  return (
    <div
      aria-hidden="true"
      className="auth-panel flex flex-col gap-6 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-14 text-white sm:mx-auto sm:w-full sm:max-w-lg sm:px-1 sm:pt-0 sm:pb-8 lg:hidden"
    >
      <div className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
        <Logo />
        Organizer
      </div>
      <div className="mx-auto flex w-full max-w-lg items-end justify-between gap-4">
        <p className="max-w-[15ch] text-[1.65rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:max-w-none sm:text-4xl">
          Seu dia inteiro, num lugar só.
        </p>
        <div className="flex shrink-0 items-end gap-1.5">
          {bars.map((w, i) => (
            <span
              key={i}
              className={`auth-bar w-2.5 rounded-full sm:w-3 ${w.c}`}
              style={{ height: w.h, animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Shell({
  title,
  description,
  children,
  footer,
  tabs,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tabs?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <div className="auth-shell flex min-h-dvh flex-col bg-background sm:max-lg:justify-center sm:max-lg:py-10 lg:bg-card">
        <BrandBand />
        {/* Phone: a sheet that rises over the band. Tablet: a centered card. Desktop: the right half. */}
        <div
          className={
            "relative -mt-8 flex flex-1 flex-col rounded-t-3xl bg-card px-5 pt-7 pb-[max(env(safe-area-inset-bottom),1.25rem)] " +
            "sm:mx-auto sm:mt-0 sm:w-full sm:max-w-lg sm:flex-none sm:rounded-3xl sm:px-10 sm:pt-9 sm:pb-8 sm:shadow-2xl " +
            "lg:mx-0 lg:mt-0 lg:max-w-none lg:flex-1 lg:rounded-none lg:border-0 lg:py-8 lg:shadow-none"
          }
        >
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 lg:justify-center lg:gap-7 lg:py-10">
            {tabs}
            <header className="flex flex-col gap-1.5">
              <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight sm:text-3xl">{title}</h1>
              {/* Two lines reserved, so switching Entrar/Criar conta doesn't move the form. */}
              {description && <p className="min-h-[2lh] text-base text-muted-foreground">{description}</p>}
            </header>
            {children}
            {footer && <div className="flex flex-wrap justify-center gap-2 text-sm">{footer}</div>}
          </div>
          <p className="mt-6 hidden text-center text-sm text-muted-foreground max-sm:block lg:block">
            <PrivacyLink />
          </p>
        </div>
        {/* Tablet: below the card. (Phone and desktop have it inside.) */}
        <p className="hidden py-6 text-center text-sm text-white/75 sm:block lg:hidden">
          <PrivacyLink />
        </p>
      </div>
    </main>
  );
}

const PrivacyLink = () => (
  <a className="underline underline-offset-4 hover:text-foreground" href="/privacidade.html" target="_blank" rel="noopener">
    Privacidade e termos
  </a>
);

/** Password field with a show/hide button. */
export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <InputGroup className="h-11">
      <InputGroupInput {...props} type={show ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          size="icon-sm"
          aria-label={show ? "Esconder senha" : "Mostrar senha"}
          aria-pressed={show}
          onClick={() => setShow((v) => !v)}
        >
          {show ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

/** Re-renders every second while `active`, for countdowns. */
function useTick(active: boolean) {
  const [, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setT((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

export function Auth({ error: outer, startMode }: { error?: string; startMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(startMode ?? "signin");
  // Sign-in pause after too many wrong passwords, and a pause between reset e-mails.
  const [resendAt, setResendAt] = useState(0);
  const locked = mode === "signin" ? waitLeft() : mode === "forgot" ? Math.max(0, resendAt - Date.now()) : 0;
  useTick(locked > 0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(outer ?? "");
  const [info, setInfo] = useState("");
  const switchTo = (m: Mode) => {
    setMode(m);
    setError("");
    setInfo("");
  };

  // A password problem doesn't make the e-mail field look wrong.
  const emailBad = !!error && !/^A senha|senha mais forte/.test(error);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setInfo("");
    // In the phone apps the page lives inside the app, which an e-mail link can't open: use the site.
    const redirect = isNativeApp ? SITE_URL + "/" : location.origin + location.pathname;
    if (mode === "signin") {
      if (waitLeft() > 0) return setBusy(false);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) clearFailures();
      else if (error.message === "Invalid login credentials") {
        const pause = recordFailure();
        const left = triesLeft();
        setError(
          pause
            ? `Muitas tentativas erradas. Por segurança, espere ${fmtWait(pause)} para tentar de novo.`
            : `E-mail ou senha incorretos.${left <= 2 ? ` Mais ${left} ${left === 1 ? "tentativa" : "tentativas"} antes de uma pausa.` : ""}`,
        );
      } else setError(msgOf(error));
    } else if (mode === "signup") {
      const weak = passwordProblem(password);
      if (weak) {
        setError(weak);
        return setBusy(false);
      }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
      if (error) setError(msgOf(error));
      else if (!data.session)
        setInfo(`Enviamos um link de confirmação para ${email}. Abra o e-mail e clique nele para ativar a conta.`);
    } else {
      // ?tipo=recuperar tells the app, when the link opens, to ask for the new password.
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect + "?tipo=recuperar" });
      if (error) setError(msgOf(error));
      else {
        setResendAt(Date.now() + 60_000);
        setInfo(
          `Se existir uma conta com ${email}, você vai receber um link em instantes. Abra-o neste mesmo navegador. Não chegou? Olhe o spam.`,
        );
      }
    }
    setBusy(false);
  };

  const title = { signin: "Que bom te ver de novo", signup: "Crie sua conta", forgot: "Recuperar senha" }[mode];
  const description = {
    signin: "Entre para ver o seu dia.",
    signup: "Grátis. Seus dados ficam salvos e sincronizados entre aparelhos.",
    forgot: "Enviaremos um link para você criar uma nova senha.",
  }[mode];
  const action = { signin: "Entrar", signup: "Criar conta", forgot: "Enviar link" }[mode];
  return (
    <Shell
      title={title}
      description={description}
      tabs={
        mode !== "forgot" && (
          <Tabs value={mode} onValueChange={(v) => switchTo(v as Mode)}>
            <TabsList className="grid h-11 w-full grid-cols-2">
              <TabsTrigger value="signin" className="text-[15px]">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-[15px]">
                Criar conta
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )
      }
      footer={
        mode === "forgot" && (
          <Button variant="link" className="h-auto p-0" onClick={() => switchTo("signin")}>
            <ArrowLeft data-icon="inline-start" />
            Voltar para entrar
          </Button>
        )
      }
    >
      <form onSubmit={submit} noValidate={false}>
        <FieldGroup>
          <Field data-invalid={emailBad}>
            <FieldLabel htmlFor="auth-email">E-mail</FieldLabel>
            <Input
              id="auth-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              spellCheck={false}
              required
              placeholder="voce@email.com"
              className="h-11"
              value={email}
              aria-invalid={emailBad}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {mode !== "forgot" && (
            <Field data-invalid={!!error}>
              <div className="flex h-6 items-center justify-between">
                <FieldLabel htmlFor="auth-pass">Senha</FieldLabel>
                {mode === "signin" && (
                  <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => switchTo("forgot")}>
                    Esqueci a senha
                  </Button>
                )}
              </div>
              <PasswordInput
                id="auth-pass"
                name="password"
                minLength={mode === "signup" ? 8 : undefined}
                required
                aria-invalid={!!error}
                aria-describedby={mode === "signup" ? "auth-pass-rules" : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {/* The hint's line is kept on both tabs (hidden when signing in), so the button below stays put. */}
              <PasswordRules
                id="auth-pass-rules"
                value={password}
                className={cn(mode !== "signup" && "invisible")}
                aria-hidden={mode !== "signup"}
              />
            </Field>
          )}
          {!error && mode === "signin" && locked > 0 && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>Muitas tentativas erradas. Por segurança, o login está pausado por alguns instantes.</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {info && (
            <Alert role="status">
              <MailCheck />
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="h-12 w-full text-base" disabled={busy || locked > 0}>
            {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {busy
              ? "Aguarde…"
              : locked > 0
                ? mode === "forgot"
                  ? `Enviar de novo em ${fmtWait(locked)}`
                  : `Tente de novo em ${fmtWait(locked)}`
                : action}
          </Button>
        </FieldGroup>
      </form>
    </Shell>
  );
}

export function NewPassword() {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const weak = passwordProblem(password);
    if (weak) return setError(weak);
    if (password !== again) return setError("As duas senhas não são iguais.");
    setBusy(true);
    const { error } = await supabase!.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        /different from the old/i.test(error.message)
          ? "A nova senha precisa ser diferente da anterior."
          : /session/i.test(error.message)
            ? "O link expirou. Volte e peça um novo."
            : msgOf(error),
      );
      return;
    }
    clearFailures();
    clearAuthLink();
    useSync.setState({ recovery: false });
    toast.success("Senha alterada", { description: "Use a nova senha da próxima vez que entrar." });
  };
  return (
    <Shell title="Crie uma nova senha" description="Escolha uma senha que você não use em outros sites.">
      <form onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="new-pass">Nova senha</FieldLabel>
            <PasswordInput
              id="new-pass"
              minLength={8}
              aria-describedby="new-pass-rules"
              required
              autoFocus
              autoComplete="new-password"
              aria-invalid={!!error}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordRules id="new-pass-rules" value={password} />
          </Field>
          <Field data-invalid={!!error && password !== again}>
            <FieldLabel htmlFor="new-pass-2">Repita a nova senha</FieldLabel>
            <PasswordInput
              id="new-pass-2"
              minLength={8}
              required
              autoComplete="new-password"
              aria-invalid={!!error && password !== again}
              value={again}
              onChange={(e) => setAgain(e.target.value)}
            />
          </Field>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
            {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {busy ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </FieldGroup>
      </form>
    </Shell>
  );
}

export function ChooseStart() {
  const candidate = useSync((s) => s.candidate)!;
  const pages = candidate.pages.length,
    items = Object.keys(candidate.items).length;
  return (
    <Shell
      title="Boas-vindas!"
      description={`Encontramos dados salvos neste navegador (${pages} páginas e ${items} tarefas). Quer levá-los para a sua conta?`}
    >
      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={() => seedAccount(candidate)}>
          Levar meus dados para a conta
        </Button>
        <Button size="lg" variant="outline" onClick={() => seedAccount(template())}>
          Começar do zero
        </Button>
      </div>
    </Shell>
  );
}

export function Loading({ text = "Carregando seu espaço…" }: { text?: string }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center gap-2 p-10 text-sm text-muted-foreground" role="status">
      <Loader2 className="size-4 animate-spin" />
      {text}
    </div>
  );
}
