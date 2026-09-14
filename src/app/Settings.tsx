"use client";

import { useCallback, useState } from "react";
import { isNativePlatform } from "@/lib/notifications";
import { applyUpdate, checkForUpdate, getCurrentVersion, type UpdateManifest } from "@/lib/updater";
import { C, DISPLAY, styles } from "@/lib/styles";
import { signOut } from "@/lib/auth";
import { useEdgeSwipeBack } from "@/lib/gestures";
import { DumbbellIcon, PlateIcon, RefreshIcon, SignOutIcon } from "./Icons";
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

  // Quando o TreinoSettings está numa sub-tela (editar programa, biblioteca),
  // ele reporta seu próprio "voltar" aqui — senão o gesto pula a sub-tela e
  // vai direto pro Hub. Na tela raiz do Treino, ele reporta null e caímos
  // de volta pro onExit normal.
  const [treinoBack, setTreinoBack] = useState<(() => void) | null>(null);
  const handleTreinoBackChange = useCallback((fn: (() => void) | null) => setTreinoBack(() => fn), []);
  const backSwipeRef = useEdgeSwipeBack(tab === "treino" && treinoBack ? treinoBack : onExit);

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
    <div style={styles.container} ref={backSwipeRef}>
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
                <button style={{ ...styles.confirmBtn, background: C.accent, color: C.cream, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleCheck}>
                  <RefreshIcon size={14} color={C.cream} />Verificar atualizações
                </button>
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
                  <div style={{ fontSize: 12.5, color: C.honeyText, marginBottom: 10 }}>Atualização disponível: {manifest.version}</div>
                  <button style={{ ...styles.confirmBtn, background: C.accent, color: C.cream, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleApply}>
                    <RefreshIcon size={14} color={C.cream} />Atualizar agora
                  </button>
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
          <button style={{ ...styles.segBtn, ...(tab === "dieta" ? styles.segBtnActive : {}), display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => setTab("dieta")}>
            <PlateIcon size={12} />Dieta
          </button>
          <button style={{ ...styles.segBtn, ...(tab === "treino" ? styles.segBtnActive : {}), display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => setTab("treino")}>
            <DumbbellIcon size={12} />Treino
          </button>
        </div>

        {tab === "dieta" && <DietSettings />}

        {tab === "treino" && <TreinoSettings onExit={onExit} onBackChange={handleTreinoBackChange} />}

        <button
          onClick={signOut}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "calc(100% - 40px)", margin: "22px 20px 0", background: "transparent", border: `1px solid ${C.bgHeader}`, color: C.lightGray, borderRadius: 8, padding: "13px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
        >
          <SignOutIcon size={14} />Sair
        </button>
    </div>
  );
}
