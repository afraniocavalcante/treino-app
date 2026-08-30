"use client";

import { useActionState, useState } from "react";
import { signIn } from "./actions";
import { C, DISPLAY, G, styles } from "@/lib/styles";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginMark}>A</div>
      <h1 style={styles.loginTitle}>
        Treino
        <br />
        A/B
      </h1>
      <p style={styles.loginSub}>Entre para ver seus treinos</p>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 28 }}>
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

        {state?.error && (
          <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{state.error}</p>
        )}

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
