"use client";

import { useState } from "react";
import { isNativePlatform } from "@/lib/notifications";
import { applyUpdate, checkForUpdate, getCurrentVersion, type UpdateManifest } from "@/lib/updater";
import { C, DISPLAY, styles } from "@/lib/styles";
import TreinoSettings from "./TreinoSettings";
import DietSettings from "./DietSettings";

type CheckState = "idle" | "checking" | "upToDate" | "available" | "applying" | "error";
type SettingsTab = "dieta" | "treino";

export default function Settings({ onExit, initialTab }: { onExit: () => void; initialTab?: SettingsTab }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab ?? "dieta");
  const [state, setState] = useState<CheckState>("idle");
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const native = isNativePlatform();

  async function handleCheck() {
    setState("checking");
    setErrorMsg("");
    try {
      const result = await checkForUpdate();
      if (result.available && result.manifest) {
        setManifest(result.manifest);
        setState("available");
      } else {
        setState("upToDate");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao verificar atualizações.");
      setState("error");
    }
  }

  async function handleApply() {
    if (!manifest) return;
    setState("applying");
    try {
      await applyUpdate(manifest);
      // The app reloads itself once the new bundle is set — nothing else to do here.
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao aplicar a atualização.");
      setState("error");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.dietHeader}>
          <button style={styles.exitBtn} onClick={onExit}>← HUB</button>
          <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, marginTop: 14 }}>Configurações</div>
        </div>

        <div style={{ ...styles.dietSectionCard, margin: "20px 20px 0" }}>
          <div style={styles.dietSectionTitle}>Versão do app</div>
          <div style={{ fontSize: 13, color: C.lightGray }}>{getCurrentVersion()}</div>
        </div>

        <div style={{ ...styles.dietSectionCard, margin: "16px 20px 0" }}>
          <div style={styles.dietSectionTitle}>Atualizações</div>

          {!native ? (
            <div style={{ fontSize: 12.5, color: C.midGray, lineHeight: 1.5 }}>
              No navegador o app está sempre na versão mais recente — essa checagem só faz sentido no app nativo (iOS).
            </div>
          ) : (
            <>
              {state === "idle" && (
                <button style={styles.confirmBtn} onClick={handleCheck}>Verificar atualizações</button>
              )}
              {state === "checking" && (
                <div style={{ fontSize: 12.5, color: C.midGray, textAlign: "center", padding: "8px 0" }}>Verificando…</div>
              )}
              {state === "upToDate" && (
                <>
                  <div style={{ fontSize: 12.5, color: C.accent, marginBottom: 10 }}>✓ Você já está na versão mais recente.</div>
                  <button style={styles.ghostBtn} onClick={handleCheck}>Verificar de novo</button>
                </>
              )}
              {state === "available" && manifest && (
                <>
                  <div style={{ fontSize: 12.5, color: C.honey, marginBottom: 10 }}>Atualização disponível: {manifest.version}</div>
                  <button style={styles.confirmBtn} onClick={handleApply}>Atualizar agora</button>
                </>
              )}
              {state === "applying" && (
                <div style={{ fontSize: 12.5, color: C.midGray, textAlign: "center", padding: "8px 0" }}>Baixando e aplicando…</div>
              )}
              {state === "error" && (
                <>
                  <div style={{ fontSize: 12.5, color: C.red, marginBottom: 10 }}>{errorMsg}</div>
                  <button style={styles.ghostBtn} onClick={handleCheck}>Tentar de novo</button>
                </>
              )}
            </>
          )}
        </div>

        <div style={{ ...styles.segRow, margin: "20px 0 0" }}>
          <button style={{ ...styles.segBtn, ...(tab === "dieta" ? styles.segBtnActive : {}) }} onClick={() => setTab("dieta")}>
            🍽️ Dieta
          </button>
          <button style={{ ...styles.segBtn, ...(tab === "treino" ? styles.segBtnActive : {}) }} onClick={() => setTab("treino")}>
            🏋️ Treino
          </button>
        </div>

        {tab === "dieta" && <DietSettings />}

        {tab === "treino" && <TreinoSettings onExit={onExit} />}
      </div>
    </div>
  );
}
