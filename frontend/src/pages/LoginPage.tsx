import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/auth";
import { login } from "../api/auth";

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const loginAction = useAuthStore((s) => s.login);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError(t("auth.error.required"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const tokenResp = await login(email, password);
      const payload = parseJwtPayload(tokenResp.access_token);
      loginAction(tokenResp.access_token, tokenResp.refresh_token, {
        id: payload.sub as string,
        email: payload.email as string,
        role: payload.role as "administrator" | "user",
      });
      navigate("/projects", { replace: true });
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, t);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>{t("app.name")}</h1>
        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              disabled={loading}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>
          {error && (
            <p id="login-error" role="alert" style={styles.error}>
              {error}
            </p>
          )}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}

function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function extractErrorMessage(err: unknown, t: (key: string) => string): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err
  ) {
    const resp = (err as { response: { status: number; data?: { detail?: string } } }).response;
    if (resp.status === 401) return t("auth.error.invalid");
    if (resp.status === 403) return t("auth.error.blocked");
    if (resp.data?.detail) return resp.data.detail;
  }
  return t("auth.error.unexpected");
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f2f5",
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: "2rem",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
  },
  heading: {
    margin: "0 0 1.5rem",
    fontSize: "1.5rem",
    fontWeight: 600,
    textAlign: "center",
  },
  field: { marginBottom: "1rem" },
  label: {
    display: "block",
    marginBottom: "0.25rem",
    fontWeight: 500,
    fontSize: "0.875rem",
  },
  input: {
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: "1px solid #ccc",
    borderRadius: 4,
    fontSize: "1rem",
  },
  error: {
    color: "#c0392b",
    fontSize: "0.875rem",
    margin: "0 0 1rem",
  },
  button: {
    width: "100%",
    padding: "0.6rem",
    background: "#0066cc",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: "1rem",
    fontWeight: 600,
    marginTop: "0.5rem",
  },
};
