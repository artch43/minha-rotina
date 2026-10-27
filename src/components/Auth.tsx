import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { seedAccount, useSync } from "../lib/sync";
import { template } from "../lib/template";

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand auth-brand">
          <span className="brand-mark" aria-hidden="true" />
          Minha Rotina
        </div>
        {children}
      </div>
      <p className="auth-foot small muted">
        Estudos, trabalho, compromissos, hábitos e anotações num só lugar.
        <br />
        <a href="/privacidade.html" target="_blank" rel="noopener">
          Privacidade e termos de uso
        </a>
      </p>
    </div>
  );
}

export function Auth() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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
        setInfo(`Enviamos um link de confirmação para ${email}. Abra o e-mail e clique no link para ativar sua conta.`);
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      if (error) setError(msgOf(error));
      else setInfo(`Se existir uma conta com ${email}, você receberá um link para criar uma nova senha.`);
    }
    setBusy(false);
  };

  const title = { signin: "Entrar", signup: "Criar conta", forgot: "Recuperar senha" }[mode];
  return (
    <Shell>
      <h1 className="auth-title">{title}</h1>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="auth-email">E-mail</label>
        <input
          id="auth-email"
          className="inp"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== "forgot" && (
          <>
            <label htmlFor="auth-pass">Senha</label>
            <input
              id="auth-pass"
              className="inp"
              type="password"
              minLength={6}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "signup" && <span className="small muted">Pelo menos 6 caracteres.</span>}
          </>
        )}
        {error && (
          <p className="auth-err" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="auth-info" role="status">
            {info}
          </p>
        )}
        <button className="btn-primary auth-submit" disabled={busy}>
          {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
        </button>
      </form>
      <div className="auth-links small">
        {mode === "signin" && (
          <>
            <button
              onClick={() => {
                setMode("forgot");
                setError("");
                setInfo("");
              }}
            >
              Esqueci minha senha
            </button>
            <span>
              Não tem conta?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setInfo("");
                }}
              >
                Criar conta
              </button>
            </span>
          </>
        )}
        {mode !== "signin" && (
          <button
            onClick={() => {
              setMode("signin");
              setError("");
              setInfo("");
            }}
          >
            ← Voltar para entrar
          </button>
        )}
      </div>
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
    <Shell>
      <h1 className="auth-title">Nova senha</h1>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="new-pass">Nova senha</label>
        <input
          id="new-pass"
          className="inp"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="auth-err" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary auth-submit" disabled={busy}>
          {busy ? "Aguarde…" : "Salvar nova senha"}
        </button>
      </form>
    </Shell>
  );
}

export function ChooseStart() {
  const candidate = useSync((s) => s.candidate)!;
  const pages = candidate.pages.length,
    items = Object.keys(candidate.items).length;
  return (
    <Shell>
      <h1 className="auth-title">Bem-vindo!</h1>
      <p>
        Encontramos dados salvos neste navegador ({pages} páginas e {items} itens). Quer levá-los para a sua conta?
      </p>
      <div className="auth-form">
        <button className="btn-primary auth-submit" onClick={() => seedAccount(candidate)}>
          Levar meus dados para a conta
        </button>
        <button className="btn auth-submit" onClick={() => seedAccount(template())}>
          Começar do zero
        </button>
      </div>
    </Shell>
  );
}

export function Loading({ text = "Carregando seu espaço…" }: { text?: string }) {
  return (
    <div className="auth">
      <p className="muted">{text}</p>
    </div>
  );
}
