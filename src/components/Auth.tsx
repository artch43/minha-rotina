import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { seedAccount, useSync } from "@/lib/sync";
import { template } from "@/lib/template";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Logo } from "./app/AppSidebar";

type Mode = "signin" | "signup" | "forgot";

const ERRORS: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail pelo link que enviamos antes de entrar.",
  "User already registered": "Já existe uma conta com este e-mail. Tente entrar.",
};
function msgOf(e: { message?: string; name?: string } | null) {
  if (!e) return "";
  const m = e.message ?? "";
  if (ERRORS[m]) return ERRORS[m];
  if (/fetch|network/i.test(m) || e.name === "AuthRetryableFetchError")
    return "Não foi possível conectar ao servidor. Verifique sua internet.";
  if (/password/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
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
        Minha Rotina
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
    <main className="grid min-h-full bg-background lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <div className="flex min-h-full flex-col bg-card px-5 py-8 sm:px-10">
        <div className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight lg:hidden">
          <Logo />
          Minha Rotina
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-7 py-10">
          {tabs}
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            {description && <p className="text-base text-muted-foreground">{description}</p>}
          </header>
          {children}
          {footer && <div className="flex flex-wrap justify-center gap-2 text-sm">{footer}</div>}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href="/privacidade.html"
            target="_blank"
            rel="noopener"
          >
            Privacidade e termos
          </a>
        </p>
      </div>
    </main>
  );
}

/** Password field with a show/hide button. */
function PasswordInput(props: React.ComponentProps<typeof Input>) {
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

export function Auth({ error: outer }: { error?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setInfo("");
    const redirect = location.origin + location.pathname;
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setError(msgOf(error));
    } else if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
      if (error) setError(msgOf(error));
      else if (!data.session)
        setInfo(`Enviamos um link de confirmação para ${email}. Abra o e-mail e clique nele para ativar a conta.`);
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      if (error) setError(msgOf(error));
      else setInfo(`Se existir uma conta com ${email}, você vai receber um link para criar uma nova senha.`);
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
          <Field data-invalid={!!error}>
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
              aria-invalid={!!error}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {mode !== "forgot" && (
            <Field data-invalid={!!error}>
              <div className="flex items-center justify-between">
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
                minLength={6}
                required
                aria-invalid={!!error}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && <FieldDescription>Pelo menos 6 caracteres.</FieldDescription>}
            </Field>
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
          <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
            {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {busy ? "Aguarde…" : action}
          </Button>
        </FieldGroup>
      </form>
    </Shell>
  );
}

export function NewPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase!.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(msgOf(error));
    else useSync.setState({ recovery: false });
  };
  return (
    <Shell title="Nova senha">
      <form onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="new-pass">Nova senha</FieldLabel>
            <PasswordInput
              id="new-pass"
              minLength={6}
              required
              autoComplete="new-password"
              aria-invalid={!!error}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            Salvar nova senha
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
