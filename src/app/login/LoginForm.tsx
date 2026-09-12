"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { C, DISPLAY, G, styles } from "@/lib/styles";

export default function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) setError("Email ou senha inválidos.");
    // On success, the auth-state listener in AuthGate picks up the new session and swaps the screen.
  }

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginMark}>A</div>
      <h1 style={styles.loginTitle}>
        Treino
        <br />
        A/B
      </h1>
      <p style={styles.loginSub}>Entre para ver seus treinos</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 28 }}>
        <label style={{ ...styles.field, ...(focusedField === "email" ? styles.fieldFocused : null) }}>
          <span style={styles.fieldLabel}>EMAIL</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
            style={styles.fieldInput}
          />
        </label>

        <label style={{ ...styles.field, ...(focusedField === "password" ? styles.fieldFocused : null) }}>
          <span style={styles.fieldLabel}>SENHA</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            style={styles.fieldInput}
          />
        </label>

        {error && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="tab-press"
          style={{
            marginTop: 8,
            width: "100%",
            padding: 19,
            background: G.lime,
            color: "#0A0A0B",
            border: "none",
            borderRadius: 16,
            fontFamily: DISPLAY,
            fontSize: 15,
            fontWeight: 700,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
            boxShadow: G.glowBtn,
          }}
        >
          {pending ? "ENTRANDO..." : "ENTRAR"}
        </button>
      </form>
    </div>
  );
}
