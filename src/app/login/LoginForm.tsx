"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

const C = {
  bgPage: "#101024",
  bgDark: "#1A1A2E",
  bgCard: "#16213E",
  bgHeader: "#0F3460",
  accent: "#E8FF47",
  white: "#FFFFFF",
  lightGray: "#B0B0C0",
  midGray: "#6B6B80",
  red: "#FF4757",
};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: C.bgPage,
        padding: 24,
      }}
    >
      <form
        action={formAction}
        style={{
          width: "100%",
          maxWidth: 360,
          background: C.bgCard,
          border: `1px solid ${C.bgHeader}`,
          borderRadius: 20,
          padding: "36px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 30,
              fontWeight: 700,
              color: C.accent,
              margin: 0,
            }}
          >
            TREINO A/B
          </h1>
          <p style={{ color: C.lightGray, fontSize: 13, marginTop: 8 }}>
            Entre para ver seus treinos
          </p>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: C.lightGray, fontWeight: 600 }}>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: C.lightGray, fontWeight: 600 }}>Senha</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={inputStyle}
          />
        </label>

        {state?.error && (
          <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            marginTop: 8,
            width: "100%",
            padding: 15,
            background: C.accent,
            color: C.bgDark,
            border: "none",
            borderRadius: 13,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 0.6,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "ENTRANDO..." : "ENTRAR"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: C.bgPage,
  border: `1px solid ${C.bgHeader}`,
  borderRadius: 10,
  padding: "12px 14px",
  color: C.white,
  fontSize: 14,
  outline: "none",
};
