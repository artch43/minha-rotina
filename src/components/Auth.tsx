import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { seedAccount, useSync } from "@/lib/sync";
import { template } from "@/lib/template";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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

function Shell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
        <Logo />
        Minha Rotina
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && <CardFooter className="flex-wrap justify-between gap-2 text-sm">{footer}</CardFooter>}
      </Card>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Tarefas, calendário, afazeres, hábitos e anotações num só lugar.{" "}
        <a className="underline underline-offset-2" href="/privacidade.html" target="_blank" rel="noopener">
          Privacidade e termos
        </a>
      </p>
    </main>
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

  const title = { signin: "Entrar", signup: "Criar conta", forgot: "Recuperar senha" }[mode];
  const action = { signin: "Entrar", signup: "Criar conta", forgot: "Enviar link" }[mode];
  return (
    <Shell
      title={title}
      description={mode === "forgot" ? "Enviaremos um link para você criar uma nova senha." : undefined}
      footer={
        mode === "signin" ? (
          <>
            <Button variant="link" className="h-auto p-0" onClick={() => switchTo("forgot")}>
              Esqueci minha senha
            </Button>
            <Button variant="link" className="h-auto p-0" onClick={() => switchTo("signup")}>
              Criar conta
            </Button>
          </>
        ) : (
          <Button variant="link" className="h-auto p-0" onClick={() => switchTo("signin")}>
            Voltar para entrar
          </Button>
        )
      }
    >
      <form onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="auth-email">E-mail</FieldLabel>
            <Input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              required
              value={email}
              aria-invalid={!!error}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {mode !== "forgot" && (
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="auth-pass">Senha</FieldLabel>
              <Input
                id="auth-pass"
                name="password"
                type="password"
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
          {error && <FieldError>{error}</FieldError>}
          {info && (
            <Alert>
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {action}
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
            <Input
              id="new-pass"
              type="password"
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
