"use client";

import { useCallback, useState } from "react";
import { isNativePlatform } from "@/lib/notifications";
import { applyUpdate, checkForUpdate, getCurrentVersion, type UpdateManifest } from "@/lib/updater";
import { C, DISPLAY, EASE, styles } from "@/lib/styles";
import { signOut } from "@/lib/auth";
import { useEdgeSwipeBack } from "@/lib/gestures";
import { applyTheme, getStoredTheme, setStoredTheme, THEMES, type ThemeId } from "@/lib/theme";
import { CheckIcon, DumbbellIcon, PlateIcon, RefreshIcon, SignOutIcon } from "./Icons";
import TreinoSettings from "./TreinoSettings";
import DietSettings from "./DietSettings";

type CheckState = "idle" | "checking" | "upToDate" | "available" | "applying" | "error";
type SettingsTab = "dieta" | "treino";

export default function Settings({ onExit, initialTab }: { onExit: () => void; initialTab?: SettingsTab }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab ?? "dieta");
  // Settings stays permanently mounted (Hub never unmounts it), so
  // initialTab only setting the state's first value isn't enough — an
  // explicit deep link (e.g. "Programas" in Treino → goSettings("treino"))
  // needs to actually switch the tab even on a later visit. React's
  // documented pattern for this (adjusting state during render, guarded by
  // a "previous prop" comparison) instead of an effect, which would cause
  // an extra render.
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab) setTab(initialTab);
  }
  const [state, setState] = useState<CheckState>("idle");
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const native = isNativePlatform();

  const [theme, setTheme] = useState<ThemeId>(() => getStoredTheme());
  function handleThemeChange(id: ThemeId) {
    setTheme(id);
    setStoredTheme(id);
    applyTheme(id);
  }

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
                <button className="tab-press" style={{ ...styles.confirmBtn, background: C.accent, color: C.cream, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleCheck}>
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
                  <button className="tab-press" style={{ ...styles.confirmBtn, background: C.accent, color: C.cream, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={handleApply}>
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

        <div style={{ ...styles.dietSectionCard, margin: "16px 20px 0" }}>
          <div style={styles.dietSectionTitle}>Aparência</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {THEMES.map((t) => {
              const active = t.id === theme;
              return (
                <button
                  key={t.id}
                  className="tab-press"
                  onClick={() => handleThemeChange(t.id)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      position: "relative",
                      background: t.preview.bg,
                      border: active ? `2px solid ${C.accent}` : `1px solid ${C.bgHeader}`,
                      boxShadow: active ? `0 0 0 3px ${C.accentSoft}` : "none",
                      transition: `border-color .2s ${EASE}, box-shadow .2s ${EASE}`,
                    }}
                  >
                    <span style={{ position: "absolute", left: 7, bottom: 7, width: 14, height: 14, borderRadius: "50%", background: t.preview.accent }} />
                    <span style={{ position: "absolute", right: 7, top: 7, width: 11, height: 11, borderRadius: "50%", background: t.preview.honey }} />
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          right: -4,
                          bottom: -4,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: C.accent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: `2px solid ${C.bgCard}`,
                          animation: `tabPopIn .35s ${EASE} both`,
                        }}
                      >
                        <CheckIcon size={9} color={C.cream} />
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: active ? C.accent : C.midGray }}>{t.label}</span>
                </button>
              );
            })}
          </div>
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
