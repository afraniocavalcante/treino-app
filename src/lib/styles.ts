import type { CSSProperties } from "react";

/**
 * "Incheon × Niemeyer" — paleta clara, cartões sólidos brancos, sem vidro/blur,
 * ícones geométricos sólidos no lugar de emoji. Os nomes das chaves originais
 * (da paleta escura "Aço · Grafite") foram mantidos para não precisar tocar
 * cada arquivo que consome `styles.*`/`C.*` — só os VALORES mudaram. Ex.:
 * `C.white` agora é a cor de tinta escura (era texto claro sobre fundo escuro,
 * agora é texto escuro sobre cartão claro) — mantém o papel de "cor de texto
 * primário", só que a paleta virou clara.
 */

export const C = {
  // superfícies
  bgPage: "#E4D9C6",
  bgDark: "#0D1B2A", // agora usado para superfícies escuras específicas (login, tab bar, spine treino)
  bgCard: "#FFFFFF",
  bgHeader: "rgba(13,27,42,.08)", // usado como cor de borda na maioria dos lugares
  // acento — treino (navy), é também a cor de tinta primária
  accent: "#0D1B2A",
  accentDim: "#0D1B2A",
  accentSoft: "rgba(13,27,42,.05)",
  accentEdge: "rgba(13,27,42,.16)",
  // texto
  white: "#0D1B2A",
  lightGray: "#4A5866",
  midGray: "#8B93A0",
  faint: "#8B93A0",
  line: "rgba(13,27,42,.08)",
  red: "#C0392B",
  green: "#0D1B2A",
  cream: "#F5EFE3", // NOVO — texto/ícone sobre superfícies escuras (navy/terracota)
  // acento — dieta / refeições (terracota)
  honey: "#C97B4A",
  honeyText: "#A85D2E", // NOVO — texto/ícone terracota sobre fundo claro (mais escuro p/ contraste)
  honeySoft: "rgba(201,123,74,.1)",
  honeyEdge: "rgba(201,123,74,.35)",
  // acento — suplementos (dourado)
  steel: "#CFA85F",
  steelLight: "#A9782E",
  steelMid: "#A9782E",
  steelSoft: "rgba(207,168,95,.16)",
  steelEdge: "rgba(207,168,95,.4)",
};

export const DISPLAY = "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif";
export const BODY = "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const EASE = "cubic-bezier(.2,.8,.2,1)";
/** A animação "leve" de entrada de tela — fade + leve subida. Usada em toda troca de tela/módulo. */
export const SCREEN_ANIM = `tabScreenIn .45s ${EASE} both`;

/** Gradientes e sombras reutilizáveis */ // NOVO
export const G = {
  screen: "linear-gradient(180deg,#F5EFE3 0%,#EFE7DA 45%)",
  screenCenter: "linear-gradient(180deg,#F5EFE3 0%,#EFE7DA 45%)",
  screenDone: "linear-gradient(180deg,#F5EFE3 0%,#EFE7DA 45%)",
  lime: "#C97B4A", // botão de ação primária — terracota chapado, sem gradiente/glow
  limeBar: "#C97B4A",
  glassActive: "rgba(201,123,74,.06)",
  glowBtn: "none",
  glowChip: "none",
  card: "none",
};

const glass: CSSProperties = {
  background: C.bgCard,
  border: `1px solid ${C.bgHeader}`,
};

export const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100dvh", background: C.bgPage, display: "flex", justifyContent: "center", fontFamily: BODY },
  // The single top-level app frame (rendered once, in Hub.tsx) — fixed to the
  // real screen height and never itself scrolls. Replaces `page` for every
  // screen that lives behind the tab bar (everything except login/loading).
  appShell: { height: "100%", width: "100%", maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", overflow: "hidden", background: G.screen, backgroundAttachment: "fixed", color: C.white, fontFamily: BODY },
  // The one scrolling region inside appShell — whichever module is active
  // lives in here. The tab bar sits below this as a normal flex sibling
  // (not position:fixed), so it can't drift the way a fixed element can in
  // a WKWebView with native safe-area insetting.
  // paddingTop uses max(): env(safe-area-inset-top) alone was resolving to 0
  // in this WKWebView, same unreliability already seen with the bottom nav's
  // env(safe-area-inset-bottom) — a floor guarantees clearance either way.
  appShellScroll: { flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", position: "relative", paddingTop: "max(59px, env(safe-area-inset-top, 59px))" } as CSSProperties,
  container: { width: "100%", position: "relative", color: C.white, minHeight: "100%", paddingBottom: 32 },
  accentBar: { height: 2, background: C.accent, boxShadow: "none" },

  // ── Home ────────────────────────────────────────────────
  homeHeader: { padding: "38px 26px 20px", position: "relative" },
  logoTitle: { fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, letterSpacing: -0.6, lineHeight: 1.14, color: C.white, margin: 0 },
  logoSub: { color: C.midGray, fontSize: 12.5, margin: "12px 0 0", letterSpacing: 0.2 },
  signOutBtn: { position: "absolute", top: 22, right: 22, background: "rgba(13,27,42,.05)", border: `1px solid ${C.bgHeader}`, color: C.midGray, borderRadius: 10, padding: "7px 13px", fontSize: 11, fontWeight: 500, cursor: "pointer" },
  hubHomeBtn: { position: "absolute", top: 22, left: 22, background: "rgba(13,27,42,.05)", border: `1px solid ${C.bgHeader}`, color: C.midGray, borderRadius: 10, padding: "7px 13px", fontSize: 11, fontWeight: 500, cursor: "pointer" }, // NOVO

  weekCard: { ...glass, margin: "0 26px 16px", borderRadius: 20, padding: 16 },
  weekDotsRow: { display: "flex", gap: 6, alignItems: "flex-end", height: 34 },
  weekDot: { flex: 1, height: "100%", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", transition: `background .4s ${EASE}, box-shadow .4s ${EASE}` },
  weekDotDone: { background: G.limeBar }, // NOVO
  weekDotCurrent: { background: G.limeBar, boxShadow: "none" }, // NOVO
  weekDotIdle: { background: "rgba(13,27,42,.08)", height: "56%" }, // NOVO
  weekDotText: { fontFamily: DISPLAY, fontSize: 12, fontWeight: 600 },
  weekInfo: { marginTop: 12, display: "flex", flexDirection: "column", gap: 4 },
  weekPhase: { fontSize: 10, fontWeight: 600, letterSpacing: 2.6, color: C.accent, textTransform: "uppercase" },
  weekDesc: { fontSize: 11.5, color: C.midGray },

  homeCards: { padding: "0 26px", display: "flex", flexDirection: "column", gap: 14 },
  workoutCard: { display: "flex", alignItems: "center", gap: 14, width: "100%", background: "rgba(13,27,42,.035)", border: `1px solid ${C.bgHeader}`, borderRadius: 20, padding: "16px 18px", textAlign: "left", color: C.white, cursor: "pointer", position: "relative", overflow: "hidden", transition: `transform .18s ${EASE}, border-color .3s ${EASE}` },
  workoutCardToday: { background: G.glassActive, border: `1px solid ${C.accentEdge}` }, // NOVO
  cardEmoji: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: "rgba(13,27,42,.06)", color: C.midGray, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, lineHeight: 1 },
  cardEmojiToday: { background: G.lime, color: C.cream, boxShadow: "none" }, // NOVO
  cardBody: { flex: 1, display: "flex", flexDirection: "column", gap: 5 },
  cardTitleRow: { display: "flex", alignItems: "center", gap: 9 },
  cardTitle: { fontFamily: DISPLAY, fontSize: 17, fontWeight: 600 },
  todayTag: { fontSize: 9, fontWeight: 700, letterSpacing: 1.2, background: G.lime, color: C.cream, padding: "3px 7px", borderRadius: 5 },
  cardSub: { fontSize: 12, color: C.midGray },
  cardCount: { fontSize: 11, color: C.faint, letterSpacing: 0.3 },
  playIcon: { fontSize: 16, color: C.accent },
  sheen: { position: "absolute", top: 0, bottom: 0, width: "35%", background: "linear-gradient(90deg,transparent,rgba(13,27,42,.1),transparent)", animation: "tabSheen 3.4s ease-in-out infinite", pointerEvents: "none" }, // NOVO

  historyBtn: { display: "block", margin: "30px auto 0", background: "rgba(13,27,42,.05)", border: `1px solid ${C.bgHeader}`, color: C.lightGray, borderRadius: 14, padding: "15px 30px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  homeFooter: { display: "flex", gap: 10, padding: "30px 26px 0" }, // NOVO

  // ── Treino: navegação ───────────────────────────────────
  workoutNav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 22px 14px" },
  workoutNavLeft: { display: "flex", alignItems: "center", gap: 10 },
  workoutNavTitle: { fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: 1 },
  weekBadge: { fontSize: 10, fontWeight: 600, letterSpacing: 0.6, color: C.cream, background: C.accent, padding: "3px 8px", borderRadius: 6 },
  exitBtn: { background: "transparent", border: "none", color: C.midGray, borderRadius: 9, padding: 0, fontSize: 11, letterSpacing: 1.2, fontWeight: 500, cursor: "pointer" },
  progressTrack: { height: 2, margin: "0 26px", background: "rgba(13,27,42,.07)", borderRadius: 2, overflow: "hidden" }, // NOVO
  progressFill: { height: "100%", background: C.accent, boxShadow: "none", transition: `width .5s ${EASE}` }, // NOVO

  // ── Treino: exercício atual ─────────────────────────────
  currentCard: { ...glass, margin: "18px 20px 0", borderRadius: 14, padding: "18px 22px 16px", textAlign: "center", boxShadow: G.card },
  currentLabel: { fontSize: 10, fontWeight: 600, letterSpacing: 2.6, color: C.accent, marginBottom: 8 },
  currentName: { fontFamily: DISPLAY, fontSize: 29, fontWeight: 600, lineHeight: 1.14, letterSpacing: -0.4, margin: 0 },
  currentReps: { fontSize: 13, color: C.lightGray, marginTop: 6 },
  lastKgHint: { fontSize: 12, color: C.midGray, marginTop: 20 },
  setsRow: { display: "flex", justifyContent: "center", gap: 10, margin: "10px 0 0" },
  setDot: { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid transparent", background: "rgba(13,27,42,.06)", color: C.faint, transition: `all .22s ${EASE}` },
  setDotDone: { background: G.lime, color: C.cream, boxShadow: G.glowChip }, // NOVO
  setDotCurrent: { background: "transparent", border: `2px solid ${C.accent}`, color: C.accent, animation: "tabDotPulse 1.9s ease-in-out infinite" }, // NOVO
  setDotText: { fontSize: 14, fontWeight: 700 },
  okBtn: { width: "100%", marginTop: 20, padding: 16, background: G.lime, color: C.cream, border: "none", borderRadius: 8, fontFamily: DISPLAY, fontSize: 14.5, fontWeight: 700, letterSpacing: 0.4, cursor: "pointer", boxShadow: "none" },

  // ── Treino: registro de carga ───────────────────────────
  inputLabel: { fontSize: 10, letterSpacing: 2.6, color: C.accent, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase" },
  inputRow: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: 8 },
  kgInput: { minWidth: 0, border: "none", background: "transparent", color: C.accent, fontFamily: DISPLAY, fontSize: 44, fontWeight: 500, letterSpacing: 0, lineHeight: 1, textAlign: "center", outline: "none", fontVariantNumeric: "tabular-nums", textShadow: "none" },
  kgUnit: { fontSize: 18, fontWeight: 500, color: C.midGray }, // NOVO
  kgAdjRow: { display: "flex", gap: 10, width: "100%", marginTop: 2, marginBottom: 12 }, // NOVO
  kgAdjBtn: { flex: 1, padding: "10px 0", background: "rgba(13,27,42,.06)", border: `1px solid ${C.bgHeader}`, color: C.white, borderRadius: 8, fontFamily: DISPLAY, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  unitHint: { fontSize: 11, color: C.midGray, textAlign: "center", marginBottom: 8, letterSpacing: 0.3 },
  confirmBtn: { width: "100%", padding: 13, background: G.lime, color: C.cream, border: "none", borderRadius: 8, fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: G.glowBtn },
  ghostBtn: { width: "100%", padding: 15, background: "transparent", border: "1px solid rgba(13,27,42,.12)", color: C.lightGray, borderRadius: 8, fontFamily: DISPLAY, fontSize: 13, fontWeight: 500, cursor: "pointer" }, // NOVO

  // ── Descanso ────────────────────────────────────────────
  restWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0" },
  restLabel: { fontSize: 10, fontWeight: 600, letterSpacing: 2.8, color: C.midGray, marginBottom: 26 },
  ringWrap: { position: "relative", width: 216, height: 216 },
  ringGlow: { position: "absolute", inset: 8, borderRadius: "50%", background: C.accent, filter: "blur(24px)", opacity: 0.16, animation: "tabGlowBreathe 3.6s ease-in-out infinite" }, // NOVO
  ringCenter: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  restTimer: { fontFamily: DISPLAY, fontSize: 58, fontWeight: 300, color: C.white, lineHeight: 1, letterSpacing: -1, fontVariantNumeric: "tabular-nums" },
  restUnit: { fontSize: 10, color: C.midGray, letterSpacing: 2, marginTop: 8 },
  nextUp: { ...glass, marginTop: 36, padding: "14px 22px", borderRadius: 16, textAlign: "center", fontSize: 16, fontWeight: 600 },
  nextUpLabel: { fontSize: 10, letterSpacing: 2, color: C.midGray, marginBottom: 6, fontWeight: 400 }, // NOVO
  skipBtn: { marginTop: 26, background: "transparent", border: "1px solid rgba(13,27,42,.14)", color: C.lightGray, borderRadius: 14, padding: "14px 34px", fontSize: 13, fontWeight: 500, cursor: "pointer" },

  // ── Próximos ────────────────────────────────────────────
  upcomingSection: { margin: "16px 26px 0" },
  upcomingHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  upcomingLabel: { fontSize: 10, fontWeight: 600, letterSpacing: 2.4, color: C.midGray },
  upcomingCount: { fontSize: 10, fontWeight: 500, letterSpacing: 1.4, color: C.faint },
  upcomingList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 210, overflowY: "auto", maskImage: "linear-gradient(#000 80%, transparent)", WebkitMaskImage: "linear-gradient(#000 80%, transparent)" } as CSSProperties,
  upcomingItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(13,27,42,.04)", border: `1px solid ${C.line}`, borderRadius: 14, transition: `opacity .4s ${EASE}` },
  upcomingNum: { width: 16, flexShrink: 0, fontFamily: DISPLAY, fontSize: 11, fontWeight: 500, color: C.faint, fontVariantNumeric: "tabular-nums" },
  upcomingInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  upcomingName: { fontSize: 13.5, fontWeight: 500 },
  upcomingMeta: { fontSize: 11, color: C.midGray },
  upcomingPlay: { width: 30, height: 30, borderRadius: 10, background: "rgba(13,27,42,.05)", border: `1px solid ${C.bgHeader}`, color: C.accent, fontSize: 11, cursor: "pointer", flexShrink: 0 },

  // ── Histórico ───────────────────────────────────────────
  topNav: { padding: "26px 26px 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  backBtn: { background: "transparent", border: "none", color: C.midGray, fontSize: 11, letterSpacing: 1.2, fontWeight: 500, cursor: "pointer", padding: 0 },
  histBody: { padding: "24px 26px 0" },
  histTitle: { fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 18px" },
  filterRow: { display: "flex", gap: 8, marginBottom: 24 }, // NOVO
  filterChip: { padding: "8px 14px", background: "rgba(13,27,42,.04)", border: `1px solid ${C.bgHeader}`, color: C.midGray, borderRadius: 11, fontSize: 12, cursor: "pointer" }, // NOVO
  filterChipActive: { background: C.accentSoft, border: `1px solid rgba(13,27,42,.45)`, color: C.accent, fontWeight: 600 }, // NOVO
  emptyState: { textAlign: "center", padding: "60px 20px", color: C.midGray, fontSize: 13.5, lineHeight: 1.6 },
  groupHeader: { display: "flex", alignItems: "center", gap: 9, marginBottom: 10 },
  groupName: { fontSize: 9.5, letterSpacing: 1.8, color: C.faint, textTransform: "uppercase" },
  groupRule: { flex: 1, height: 1, background: C.line },
  groupCount: { fontSize: 10.5, color: C.faint, letterSpacing: 0.8 },
  histEntry: { display: "flex", alignItems: "center", gap: 14, width: "100%", background: "rgba(13,27,42,.04)", border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px", marginBottom: 10, color: C.white, fontSize: 13.5, cursor: "pointer", textAlign: "left" },
  histEntryBadge: { width: 40, height: 40, flexShrink: 0, borderRadius: 13, background: "rgba(13,27,42,.06)", color: C.midGray, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: 15, fontWeight: 700 }, // NOVO
  histEntryBadgeA: { background: C.accentSoft, border: `1px solid ${C.accentEdge}`, color: C.accent }, // NOVO
  histEntryLeft: { flex: 1, display: "flex", flexDirection: "column", gap: 3 },
  histEntryDate: { fontFamily: DISPLAY, fontSize: 14, fontWeight: 600 },
  histEntryWeek: { fontSize: 11.5, color: C.midGray },
  histEntryCount: { fontSize: 14, color: "#4E4E48" },

  // ── Detalhe da sessão ───────────────────────────────────
  detailTitle: { fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 18px" },
  detailSub: { fontSize: 12, color: C.midGray, margin: "0 0 22px" },
  detailStatsRow: { display: "flex", gap: 10, marginBottom: 24 }, // NOVO
  detailStat: { ...glass, flex: 1, borderRadius: 16, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 4 }, // NOVO
  histExCard: { display: "flex", flexDirection: "column", gap: 9, paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${C.line}` },
  histExName: { fontSize: 14, fontWeight: 600 },
  histExDelta: { fontSize: 11, color: C.accent }, // NOVO
  histSetsRow: { display: "flex", gap: 7 },
  histSetBadge: { flex: 1, textAlign: "center", background: "rgba(13,27,42,.05)", border: `1px solid ${C.bgHeader}`, borderRadius: 10, padding: "9px 0", fontSize: 11.5, fontVariantNumeric: "tabular-nums" },
  histSetLabel: { fontSize: 9.5, color: C.midGray, fontWeight: 500, letterSpacing: 0.6 },
  histSetKg: { fontFamily: DISPLAY, fontSize: 11.5, fontWeight: 600, color: C.white },

  // ── Conclusão ───────────────────────────────────────────
  doneWrap: { minHeight: "100dvh", background: G.screenDone, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px", textAlign: "center" },
  doneBadgeWrap: { position: "relative", width: 112, height: 112, display: "flex", alignItems: "center", justifyContent: "center" },
  doneGlow: { position: "absolute", inset: 0, borderRadius: "50%", background: C.accent, filter: "blur(22px)", opacity: 0.28, animation: "tabGlowBreathe 3.2s ease-in-out infinite" },
  doneCheck: { width: 80, height: 80, borderRadius: "50%", background: "rgba(13,27,42,.06)", border: "1.5px solid rgba(13,27,42,.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: C.accent, animation: `tabPopIn .7s ${EASE} both` },
  doneTitle: { fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.16, margin: "28px 0 0" },
  doneSub: { color: C.midGray, fontSize: 12.5, margin: "12px 0 0" },
  doneStats: { display: "flex", gap: 10, width: "100%", marginTop: 34 },
  doneStat: { ...glass, flex: 1, borderRadius: 18, padding: "18px 8px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" },
  doneStatValue: { fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, color: C.accent, lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  doneStatLabel: { fontSize: 9, color: C.midGray, letterSpacing: 1.3 },
  doneChart: { display: "flex", alignItems: "flex-end", gap: 8, height: 72, marginTop: 30 }, // NOVO
  doneBar: { width: 15, borderRadius: 4, background: "rgba(13,27,42,.1)", transformOrigin: "bottom" }, // NOVO
  doneBarLast: { background: G.limeBar, boxShadow: "none" }, // NOVO
  doneBtn: { width: "100%", marginTop: 34, background: G.lime, color: C.cream, border: "none", borderRadius: 16, padding: 18, fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: G.glowBtn },

  // ── Programa / fases / exercícios ───────────────────────
  sectionLabel: { fontSize: 9.5, letterSpacing: 1.8, color: C.faint, marginBottom: 10 }, // NOVO
  phaseCard: { padding: "18px 20px", background: "rgba(13,27,42,.04)", border: `1px solid ${C.bgHeader}`, borderRadius: 20, display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }, // NOVO
  phaseCardActive: { background: G.glassActive, border: `1px solid rgba(13,27,42,.26)`, gap: 12 }, // NOVO
  phaseName: { fontFamily: DISPLAY, fontSize: 15, fontWeight: 600 }, // NOVO
  phaseMeta: { fontSize: 11.5, color: C.midGray }, // NOVO
  phaseWeeksRow: { display: "flex", gap: 4 }, // NOVO
  phaseWeek: { flex: 1, height: 4, borderRadius: 2, background: "rgba(13,27,42,.1)" }, // NOVO
  phaseWeekDone: { background: C.accent }, // NOVO
  rowItem: { display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", background: "rgba(13,27,42,.04)", border: `1px solid ${C.line}`, borderRadius: 16, marginBottom: 8, cursor: "pointer" }, // NOVO
  rowItemActive: { background: C.bgCard, border: `1px solid ${C.bgHeader}` }, // NOVO
  dragHandle: { fontSize: 14, color: "#4E4E48", letterSpacing: 1, cursor: "grab" }, // NOVO
  numField: { flex: 1, padding: "11px 12px", background: "rgba(13,27,42,.05)", border: `1px solid ${C.bgHeader}`, borderRadius: 12, display: "flex", flexDirection: "column", gap: 3 }, // NOVO
  numFieldLabel: { fontSize: 8.5, letterSpacing: 1.2, color: C.midGray }, // NOVO
  numFieldValue: { fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", background: "transparent", border: "none", color: C.white, outline: "none", width: "100%", padding: 0 }, // NOVO
  addBtn: { width: "100%", padding: 16, background: "transparent", border: `1px dashed ${C.accentEdge}`, color: C.accent, borderRadius: 14, fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, cursor: "pointer" }, // NOVO
  searchField: { width: "100%", padding: "14px 16px", background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 14, fontSize: 13, color: C.white, outline: "none" }, // NOVO
  libRow: { display: "flex", alignItems: "center", gap: 14, padding: "15px 0", borderBottom: `1px solid ${C.line}` }, // NOVO
  libAdd: { width: 26, height: 26, borderRadius: 9, background: "rgba(13,27,42,.05)", border: "1px solid rgba(13,27,42,.1)", color: C.midGray, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer" }, // NOVO
  libAddActive: { background: C.accentSoft, border: `1px solid rgba(13,27,42,.4)`, color: C.accent }, // NOVO

  // ── Progresso ───────────────────────────────────────────
  chartCard: { ...glass, margin: "24px 20px 0", borderRadius: 24, padding: "22px 20px 18px" }, // NOVO
  chartValue: { fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, color: C.accent, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: "none" }, // NOVO
  chartDelta: { marginLeft: "auto", fontSize: 11.5, color: C.accent }, // NOVO
  chartAxis: { display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.faint, marginTop: 6 }, // NOVO

  // ── Login ───────────────────────────────────────────────
  // Login continua em navy fixo mesmo com o resto do app em paleta clara — cores literais, não vêm de C.*.
  loginWrap: { minHeight: "100dvh", background: "#0D1B2A", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 28px max(56px, env(safe-area-inset-bottom, 56px))", position: "relative", overflow: "hidden" }, // NOVO
  loginMark: { width: 52, height: 52, borderRadius: 6, background: "#C97B4A", color: "#F5EFE3", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, position: "relative", zIndex: 1 }, // NOVO
  loginTitle: { fontFamily: DISPLAY, fontSize: 32, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.15, margin: "26px 0 0", color: "#F5EFE3", position: "relative", zIndex: 1 }, // NOVO
  loginSub: { fontSize: 13, color: "#9BA8B6", margin: "12px 0 0", lineHeight: 1.5, position: "relative", zIndex: 1 }, // NOVO
  field: { padding: "16px 18px", background: "rgba(13,27,42,.04)", border: "1px solid rgba(13,27,42,.14)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 5, position: "relative", zIndex: 1 }, // NOVO
  fieldFocused: { border: "1px solid rgba(201,123,74,.5)" }, // NOVO
  fieldLabel: { fontSize: 9.5, letterSpacing: 1.4, color: "#7C8A9A" }, // NOVO
  fieldInput: { fontSize: 14, color: "#D9DEE4", background: "transparent", border: "none", outline: "none", padding: 0, fontFamily: BODY }, // NOVO

  // ── Conflito de sessão ──────────────────────────────────
  // zIndex matches the other full-screen overlays in WorkoutApp.tsx
  // (showExitConfirm/gifModalUrl, both 1000) — needs to clear the bottom tab
  // bar, which sits in the same body-level stacking context (see the
  // html/body position:fixed fix earlier this session).
  scrim: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", zIndex: 1000 }, // NOVO
  sheet: { margin: "0 14px 14px", padding: "30px 26px 26px", background: "rgba(255,255,255,.92)", border: "1px solid rgba(13,27,42,.1)", borderRadius: 30, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 30px 70px -30px rgba(0,0,0,.35)", animation: `tabFadeUp .4s ${EASE} both`, width: "100%" }, // NOVO
  sheetIcon: { width: 44, height: 44, borderRadius: 14, background: C.accentSoft, border: `1px solid rgba(13,27,42,.4)`, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600 }, // NOVO
  sheetTitle: { fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.3, lineHeight: 1.24, margin: "20px 0 0" }, // NOVO
  sheetBody: { fontSize: 13, color: C.midGray, margin: "10px 0 0", lineHeight: 1.55 }, // NOVO

  loadingWrap: { minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", color: C.midGray, fontSize: 13 },

  // ── Hub ─────────────────────────────────────────────────
  hubHeader: { padding: "38px 26px 6px" },
  hubGreeting: { fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, letterSpacing: -0.5, margin: 0 },
  hubSub: { fontSize: 12.5, color: C.midGray, margin: "8px 0 0" },
  hubCards: { padding: "18px 26px 0", display: "flex", flexDirection: "column", gap: 14 },
  hubModuleCard: { display: "flex", alignItems: "center", gap: 14, width: "100%", background: "rgba(13,27,42,.035)", border: `1px solid ${C.bgHeader}`, borderRadius: 22, padding: "18px 20px", textAlign: "left", color: C.white, cursor: "pointer", transition: `transform .18s ${EASE}` }, // NOVO
  hubModuleIcon: { width: 48, height: 48, flexShrink: 0, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }, // NOVO
  hubModuleBody: { flex: 1, display: "flex", flexDirection: "column", gap: 4 }, // NOVO
  hubModuleTitle: { fontFamily: DISPLAY, fontSize: 17, fontWeight: 600 }, // NOVO
  hubModuleSub: { fontSize: 12, color: C.midGray }, // NOVO
  hubModuleStat: { fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, color: C.accent }, // NOVO
  // paddingBottom usa max(): não confiamos em env(safe-area-inset-bottom) sozinho
  // pra determinar a altura visível da barra — em testes reais ele voltou valores
  // inconsistentes entre módulos com o contentInset:"always" do iOS (às vezes 0,
  // às vezes o valor real), o que fazia a barra parecer de tamanho diferente
  // dependendo da tela. Um mínimo fixo garante a mesma altura sempre; se o
  // dispositivo reportar um valor real maior (notch grande), esse prevalece.
  hubBottomNav: { flexShrink: 0, width: "100%", display: "flex", background: C.bgDark, padding: "12px 8px max(26px, env(safe-area-inset-bottom, 26px))" }, // NOVO — barra global do app (Hoje/Dieta/Treino/Insights/Config), fluxo normal dentro do appShell (não fixed — evita o bug de deslocamento em WKWebView)
  hubNavBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "transparent", border: "none", padding: "6px 0", cursor: "pointer", color: "#7C8A9A", fontSize: 11, fontWeight: 600 }, // NOVO
  hubNavBtnActive: { color: C.cream }, // NOVO
  hubNavIcon: { fontSize: 21, lineHeight: 1 }, // NOVO — mantido por compat; ícones reais agora vêm de Icons.tsx
  hubNavDot: { width: 5, height: 5, borderRadius: "50%", background: "currentColor", opacity: 0 }, // NOVO
  hubNavDotActive: { opacity: 1 }, // NOVO

  // ── Controle segmentado (sub-abas dentro de uma seção, ex.: Dieta Hoje/Progresso/Compras/Mais, Config Dieta/Treino) ──
  segRow: { display: "flex", gap: 6, padding: "0 20px 14px" }, // NOVO
  segBtn: { flex: 1, padding: "9px 0", borderRadius: 12, border: `1px solid ${C.bgHeader}`, background: "rgba(13,27,42,.03)", color: C.midGray, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }, // NOVO
  segBtnActive: { background: C.accentSoft, border: `1px solid ${C.accentEdge}`, color: C.accent }, // NOVO

  // ── Hub redesign (aço = tom neutro para dados combinados/retrospectivos) ──
  hubStreakPill: { display: "inline-flex", alignItems: "center", gap: 6, background: C.steelSoft, border: `1px solid ${C.steelEdge}`, borderRadius: 10, padding: "5px 11px", fontSize: 12, fontWeight: 700, color: C.steelLight }, // NOVO
  hubBadgePill: { display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(159,180,196,.08)", border: "1px solid rgba(159,180,196,.22)", borderRadius: 10, padding: "5px 11px", fontSize: 11.5, fontWeight: 600, color: C.steelMid }, // NOVO
  hubBanner: { margin: "14px 20px 0", padding: "11px 15px", borderRadius: 14, background: "rgba(240,180,41,.08)", border: "1px solid rgba(240,180,41,.26)", fontSize: 12, color: "#E0AE4E", lineHeight: 1.55 }, // NOVO
  offlineBanner: { margin: "14px 20px 0", padding: "10px 14px", borderRadius: 14, background: "rgba(159,180,196,.1)", border: "1px solid rgba(159,180,196,.3)", fontSize: 12, color: C.steelLight, lineHeight: 1.5, display: "flex", alignItems: "center", gap: 8 }, // NOVO

  hubTrackCard: { borderRadius: 18, padding: "14px 18px", margin: "16px 20px 0", background: "rgba(13,27,42,.035)", border: `1px solid ${C.bgHeader}`, display: "flex", alignItems: "center", justifyContent: "space-between" }, // NOVO
  hubTrackLabel: { fontSize: 12, fontWeight: 700, color: C.lightGray, letterSpacing: 0.3 }, // NOVO
  hubRingRow: { display: "flex", gap: 16 }, // NOVO
  hubRingCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }, // NOVO
  hubRingWrap: { width: 44, height: 44, position: "relative", flexShrink: 0 }, // NOVO
  hubRingMask: { position: "absolute", inset: 0, borderRadius: "50%", WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px))", mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px))" } as CSSProperties, // NOVO
  hubRingIcon: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }, // NOVO
  hubRingFrac: { fontSize: 9.5, color: C.midGray, fontWeight: 600 }, // NOVO

  hubActionCard: { borderRadius: 24, padding: "20px 22px", margin: "18px 20px 0", background: C.bgCard, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", cursor: "pointer" }, // NOVO
  hubActionHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }, // NOVO
  hubViewBtn: { background: "transparent", border: `1px solid ${C.bgHeader}`, color: C.lightGray, borderRadius: 10, padding: "7px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }, // NOVO
  hubKcalTrack: { height: 5, borderRadius: 3, background: "rgba(13,27,42,.07)", overflow: "hidden", marginBottom: 16 }, // NOVO
  hubKcalFill: { height: "100%", borderRadius: 3, background: C.honey }, // NOVO
  hubUpperLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.faint, textTransform: "uppercase", marginBottom: 8 }, // NOVO

  hubCompactRow: { borderRadius: 18, padding: "14px 18px", margin: "16px 20px 0", background: "rgba(13,27,42,.035)", display: "flex", alignItems: "center", gap: 12 }, // NOVO
  hubCompactIcon: { width: 40, height: 40, borderRadius: 13, background: "rgba(13,27,42,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }, // NOVO
  hubCompactTitle: { fontSize: 14, fontWeight: 600 }, // NOVO
  hubCompactSub: { fontSize: 11.5, color: C.midGray, marginTop: 1 }, // NOVO
  hubDoneBadge: { width: 26, height: 26, borderRadius: "50%", background: "rgba(13,27,42,.16)", border: "1px solid rgba(13,27,42,.4)", color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }, // NOVO
  hubCtaText: { display: "flex", alignItems: "center", gap: 5, flexShrink: 0, color: C.accent, fontSize: 12, fontWeight: 600 }, // NOVO

  hubRetroLabel: { margin: "26px 20px 0 22px", fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.faint, textTransform: "uppercase" }, // NOVO
  hubRetroCard: { borderRadius: 10, padding: "16px 18px", margin: "10px 20px 0", background: C.bgCard, border: `1px solid ${C.bgHeader}` }, // NOVO
  hubRetroTitle: { fontSize: 12.5, fontWeight: 600, color: C.lightGray }, // NOVO
  hubRetroFoot: { textAlign: "center", fontSize: 11.5, color: C.faint, lineHeight: 1.6, margin: "16px 20px 0" }, // NOVO

  mealChevron: { fontSize: 13, color: C.midGray, flexShrink: 0, transition: `transform .25s ${EASE}` }, // NOVO
  mealBodyWrap: { display: "grid", overflow: "hidden", transition: `grid-template-rows .32s ${EASE}` }, // NOVO (gridTemplateRows set inline)
  fruitSwitchTrack: { width: 38, height: 22, borderRadius: 11, flexShrink: 0, cursor: "pointer", position: "relative", transition: `background .15s ${EASE}` }, // NOVO
  fruitSwitchThumb: { width: 16, height: 16, borderRadius: "50%", position: "absolute", top: 2, transition: `left .15s ${EASE}` }, // NOVO

  // ── Dieta ───────────────────────────────────────────────
  dietHeader: { padding: "30px 26px 16px" },
  dietStreakPill: { display: "inline-flex", alignItems: "center", gap: 6, background: C.accentSoft, border: `1px solid ${C.accentEdge}`, borderRadius: 10, padding: "5px 10px", fontSize: 12, fontWeight: 700, color: C.accent }, // NOVO
  dietKcalCard: { ...glass, margin: "0 20px", borderRadius: 24, padding: "18px 20px" }, // NOVO
  dietRingOuter: { width: 84, height: 84, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }, // NOVO (background set inline: conic-gradient)
  dietRingInner: { width: 66, height: 66, borderRadius: "50%", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }, // NOVO
  dietRingKcal: { fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, color: C.white, lineHeight: 1 }, // NOVO
  dietRingTarget: { fontSize: 8.5, color: C.midGray, marginTop: 2 }, // NOVO
  dietMacroRow: { display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, marginBottom: 3 }, // NOVO
  dietMacroTrack: { height: 7, borderRadius: 5, background: "rgba(13,27,42,.08)", overflow: "hidden" }, // NOVO
  dietMacroFill: { height: "100%", borderRadius: 5, transition: `width .3s ${EASE}` }, // NOVO
  dietWarningBanner: { marginTop: 12, padding: "9px 12px", borderRadius: 12, background: "rgba(255,95,82,.12)", border: "1px solid rgba(255,95,82,.3)", color: C.red, fontSize: 11.5, fontWeight: 600 }, // NOVO

  dietMealList: { padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 10 }, // NOVO
  dietMealCard: { ...glass, borderRadius: 20, padding: "15px 17px" }, // NOVO
  dietMealHead: { display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }, // NOVO
  dietMealIcon: { width: 36, height: 36, borderRadius: 12, background: "rgba(240,180,41,.14)", color: C.honey, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }, // NOVO
  dietMealName: { fontSize: 15, fontWeight: 600 }, // NOVO
  dietMealSummary: { fontSize: 11.5, color: C.midGray, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, // NOVO
  dietMealBadge: { width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.cream }, // NOVO
  dietMealBody: { marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 6, animation: `tabFadeUp .2s ${EASE}` }, // NOVO
  dietOptionRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 13, cursor: "pointer", transition: `background .18s ${EASE}` }, // NOVO
  dietOptionRowSelected: { background: C.honeySoft }, // NOVO
  dietRadio: { width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: "2px solid rgba(13,27,42,.25)", display: "flex", alignItems: "center", justifyContent: "center", transition: `all .18s ${EASE}` }, // NOVO
  dietRadioSelected: { border: "none", background: C.honey }, // NOVO
  dietOptionLabel: { flex: 1, fontSize: 13, fontWeight: 500, lineHeight: 1.35 }, // NOVO
  dietOptionMacro: { fontSize: 10.5, color: C.midGray, marginTop: 1 }, // NOVO
  dietOptionKcal: { fontSize: 11, fontWeight: 700, color: C.midGray, whiteSpace: "nowrap" }, // NOVO
  dietGroupTitle: { fontSize: 10, fontWeight: 700, letterSpacing: 1.6, color: C.faint, textTransform: "uppercase", margin: "8px 0 4px" }, // NOVO
  dietPortionRow: { display: "flex", gap: 7, marginTop: 6 }, // NOVO
  dietPortionBtn: { flex: 1, padding: "8px 0", borderRadius: 11, border: `1px solid ${C.bgHeader}`, background: "transparent", color: C.white, fontSize: 12, fontWeight: 700, cursor: "pointer" }, // NOVO
  dietPortionBtnActive: { background: C.honey, border: "none", color: C.cream }, // NOVO

  dietSuppMini: { ...glass, borderRadius: 20, padding: "14px 17px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }, // NOVO
  dietSuppIcon: { width: 36, height: 36, borderRadius: 12, background: C.honeySoft, color: C.honeyText, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }, // NOVO

  dietSectionCard: { ...glass, margin: "0 20px", borderRadius: 22, padding: "18px 20px" }, // NOVO
  dietSectionTitle: { fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, marginBottom: 12 }, // NOVO
  dietWeekBars: { display: "flex", gap: 7, alignItems: "flex-end", height: 76, marginBottom: 10 }, // NOVO
  dietWeekBarCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end" }, // NOVO
  dietWeekBar: { width: "100%", borderRadius: 4, transition: `height .3s ${EASE}` }, // NOVO
  dietWeekBarLabel: { fontSize: 9, fontWeight: 600, color: C.faint }, // NOVO
  dietInsightText: { fontSize: 11.5, color: C.midGray, lineHeight: 1.6 }, // NOVO

  dietMeasureGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }, // NOVO
  dietMeasureField: { display: "flex", flexDirection: "column", gap: 4 }, // NOVO
  dietMeasureLabel: { fontSize: 10, fontWeight: 600, color: C.midGray }, // NOVO
  dietMeasureInput: { padding: "10px 12px", background: "rgba(13,27,42,.05)", border: `1px solid ${C.bgHeader}`, borderRadius: 12, color: C.white, fontSize: 13, outline: "none" }, // NOVO
  dietMeasureHistRow: { display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(13,27,42,.03)" }, // NOVO

  dietShopHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", marginBottom: 4 }, // NOVO
  dietShopCount: { fontSize: 12, color: C.midGray }, // NOVO
  dietShopReset: { background: "transparent", border: `1px solid ${C.bgHeader}`, color: C.lightGray, borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }, // NOVO
  dietShopRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", cursor: "pointer" }, // NOVO
  dietShopCheck: { width: 18, height: 18, borderRadius: 6, border: `2px solid ${C.faint}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.cream, fontWeight: 700 }, // NOVO
  dietShopCheckOn: { background: C.accent, border: "none" }, // NOVO
  dietShopLabel: { fontSize: 13, fontWeight: 500 }, // NOVO
  dietShopLabelOn: { textDecoration: "line-through", opacity: 0.45 }, // NOVO

  dietStatCols: { display: "flex", gap: 18, marginTop: 12 }, // NOVO
  dietStatColLabel: { fontSize: 10, fontWeight: 700, color: C.midGray, letterSpacing: 0.6 }, // NOVO
  dietStatColValue: { fontSize: 13, fontWeight: 700, marginTop: 3 }, // NOVO
  dietBulletRow: { display: "flex", gap: 9, alignItems: "flex-start" }, // NOVO
  dietBulletDot: { width: 5, height: 5, borderRadius: "50%", background: C.honey, marginTop: 6, flexShrink: 0 }, // NOVO
  dietFruitGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, // NOVO
};
