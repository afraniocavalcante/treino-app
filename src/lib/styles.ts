import type { CSSProperties } from "react";

/**
 * Aço · Grafite — paleta preto + lima, superfícies de vidro, gradientes e luz.
 * Todas as chaves originais foram mantidas; chaves novas (opcionais) marcadas com // NOVO.
 */

export const C = {
  // superfícies
  bgPage: "#08080A",
  bgDark: "#08080A",
  bgCard: "rgba(255,255,255,.05)",
  bgHeader: "rgba(255,255,255,.09)", // usado como cor de borda na maioria dos lugares
  // acento
  accent: "#E8FF47",
  accentDim: "#A8BE22", // NOVO
  accentSoft: "rgba(232,255,71,.12)", // NOVO
  accentEdge: "rgba(232,255,71,.30)", // NOVO
  // texto
  white: "#F2F2EE",
  lightGray: "#C8C8BE",
  midGray: "#8A8A82",
  faint: "#6E6E66",
  line: "rgba(255,255,255,.06)",
  red: "#FF5F52",
  green: "#E8FF47", // o verde de sucesso passa a ser o próprio acento
};

export const DISPLAY = "'Sora', -apple-system, BlinkMacSystemFont, sans-serif";
export const BODY = "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const EASE = "cubic-bezier(.2,.8,.2,1)";

/** Gradientes e sombras reutilizáveis */ // NOVO
export const G = {
  screen: "radial-gradient(120% 55% at 50% 6%, #1A1A16 0%, #08080A 60%)",
  screenCenter: "radial-gradient(90% 50% at 50% 42%, #1F1F18 0%, #08080A 68%)",
  screenDone: "radial-gradient(90% 50% at 50% 34%, #23230F 0%, #08080A 70%)",
  lime: "linear-gradient(180deg,#F2FF7A,#D2E82F)",
  limeBar: "linear-gradient(180deg,#F2FF7A,#A8BE22)",
  glassActive: "linear-gradient(140deg, rgba(232,255,71,.14), rgba(255,255,255,.03))",
  glowBtn: "0 18px 44px -20px rgba(232,255,71,.9)",
  glowChip: "0 0 24px rgba(232,255,71,.35)",
  card: "0 24px 60px -34px rgba(0,0,0,.95)",
};

const glass: CSSProperties = {
  background: C.bgCard,
  border: `1px solid ${C.bgHeader}`,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

export const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", background: C.bgPage, display: "flex", justifyContent: "center", fontFamily: BODY },
  container: { width: "100%", maxWidth: 440, minHeight: "100vh", background: G.screen, backgroundAttachment: "fixed", color: C.white, position: "relative", overflow: "hidden", paddingBottom: 48 },
  accentBar: { height: 2, background: C.accent, boxShadow: "0 0 14px rgba(232,255,71,.8)" },

  // ── Home ────────────────────────────────────────────────
  homeHeader: { padding: "38px 26px 20px", position: "relative" },
  logoTitle: { fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, letterSpacing: -0.6, lineHeight: 1.14, color: C.white, margin: 0 },
  logoSub: { color: C.midGray, fontSize: 12.5, margin: "12px 0 0", letterSpacing: 0.2 },
  signOutBtn: { position: "absolute", top: 22, right: 22, background: "rgba(255,255,255,.05)", border: `1px solid ${C.bgHeader}`, color: C.midGray, borderRadius: 10, padding: "7px 13px", fontSize: 11, fontWeight: 500, cursor: "pointer" },

  weekCard: { ...glass, margin: "0 26px 16px", borderRadius: 20, padding: 16 },
  weekDotsRow: { display: "flex", gap: 6, alignItems: "flex-end", height: 34 },
  weekDot: { flex: 1, height: "100%", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", transition: `background .4s ${EASE}, box-shadow .4s ${EASE}` },
  weekDotDone: { background: G.limeBar }, // NOVO
  weekDotCurrent: { background: G.limeBar, boxShadow: "0 0 18px rgba(232,255,71,.55)" }, // NOVO
  weekDotIdle: { background: "rgba(255,255,255,.08)", height: "56%" }, // NOVO
  weekDotText: { fontFamily: DISPLAY, fontSize: 12, fontWeight: 600 },
  weekInfo: { marginTop: 12, display: "flex", flexDirection: "column", gap: 4 },
  weekPhase: { fontSize: 10, fontWeight: 600, letterSpacing: 2.6, color: C.accent, textTransform: "uppercase" },
  weekDesc: { fontSize: 11.5, color: C.midGray },

  homeCards: { padding: "0 26px", display: "flex", flexDirection: "column", gap: 14 },
  workoutCard: { display: "flex", alignItems: "center", gap: 14, width: "100%", background: "rgba(255,255,255,.035)", border: `1px solid ${C.bgHeader}`, borderRadius: 20, padding: "16px 18px", textAlign: "left", color: C.white, cursor: "pointer", position: "relative", overflow: "hidden", transition: `transform .18s ${EASE}, border-color .3s ${EASE}` },
  workoutCardToday: { background: G.glassActive, border: `1px solid ${C.accentEdge}` }, // NOVO
  cardEmoji: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, background: "rgba(255,255,255,.06)", color: C.midGray, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, lineHeight: 1 },
  cardEmojiToday: { background: G.lime, color: "#0A0A0B", boxShadow: "0 0 30px rgba(232,255,71,.4)" }, // NOVO
  cardBody: { flex: 1, display: "flex", flexDirection: "column", gap: 5 },
  cardTitleRow: { display: "flex", alignItems: "center", gap: 9 },
  cardTitle: { fontFamily: DISPLAY, fontSize: 17, fontWeight: 600 },
  todayTag: { fontSize: 9, fontWeight: 700, letterSpacing: 1.2, background: G.lime, color: "#0A0A0B", padding: "3px 7px", borderRadius: 5 },
  cardSub: { fontSize: 12, color: C.midGray },
  cardCount: { fontSize: 11, color: C.faint, letterSpacing: 0.3 },
  playIcon: { fontSize: 16, color: C.accent },
  sheen: { position: "absolute", top: 0, bottom: 0, width: "35%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)", animation: "tabSheen 3.4s ease-in-out infinite", pointerEvents: "none" }, // NOVO

  historyBtn: { display: "block", margin: "30px auto 0", background: "rgba(255,255,255,.05)", border: `1px solid ${C.bgHeader}`, color: C.lightGray, borderRadius: 14, padding: "15px 30px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  homeFooter: { display: "flex", gap: 10, padding: "30px 26px 0" }, // NOVO

  // ── Treino: navegação ───────────────────────────────────
  workoutNav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "26px 26px 18px" },
  workoutNavLeft: { display: "flex", alignItems: "center", gap: 10 },
  workoutNavTitle: { fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: 1 },
  weekBadge: { fontSize: 10, fontWeight: 600, letterSpacing: 0.6, color: "#0A0A0B", background: C.accent, padding: "3px 8px", borderRadius: 6 },
  exitBtn: { background: "transparent", border: "none", color: C.midGray, borderRadius: 9, padding: 0, fontSize: 11, letterSpacing: 1.2, fontWeight: 500, cursor: "pointer" },
  progressTrack: { height: 2, margin: "0 26px", background: "rgba(255,255,255,.07)", borderRadius: 2, overflow: "hidden" }, // NOVO
  progressFill: { height: "100%", background: C.accent, boxShadow: "0 0 14px rgba(232,255,71,.8)", transition: `width .5s ${EASE}` }, // NOVO

  // ── Treino: exercício atual ─────────────────────────────
  currentCard: { ...glass, margin: "26px 20px 0", borderRadius: 28, padding: "32px 24px 26px", textAlign: "center", boxShadow: G.card },
  currentLabel: { fontSize: 10, fontWeight: 600, letterSpacing: 2.6, color: C.accent, marginBottom: 14 },
  currentName: { fontFamily: DISPLAY, fontSize: 29, fontWeight: 600, lineHeight: 1.14, letterSpacing: -0.4, margin: 0 },
  currentReps: { fontSize: 13, color: C.lightGray, marginTop: 10 },
  lastKgHint: { fontSize: 12, color: C.midGray, marginTop: 20 },
  setsRow: { display: "flex", justifyContent: "center", gap: 10, margin: "26px 0 0" },
  setDot: { width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid transparent", background: "rgba(255,255,255,.06)", color: C.faint, transition: `all .22s ${EASE}` },
  setDotDone: { background: G.lime, color: "#0A0A0B", boxShadow: G.glowChip }, // NOVO
  setDotCurrent: { background: "transparent", border: `2px solid ${C.accent}`, color: C.accent, animation: "tabDotPulse 1.9s ease-in-out infinite" }, // NOVO
  setDotText: { fontSize: 14, fontWeight: 700 },
  okBtn: { width: "100%", marginTop: 20, padding: 18, background: G.lime, color: "#0A0A0B", border: "none", borderRadius: 16, fontFamily: DISPLAY, fontSize: 14.5, fontWeight: 700, letterSpacing: 0.4, cursor: "pointer", boxShadow: "0 16px 40px -18px rgba(232,255,71,.85)" },

  // ── Treino: registro de carga ───────────────────────────
  inputLabel: { fontSize: 10, letterSpacing: 2.6, color: C.accent, fontWeight: 600, display: "block", marginBottom: 12, textTransform: "uppercase" },
  inputRow: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: 18 },
  kgInput: { width: 150, border: "none", background: "transparent", color: C.accent, fontFamily: DISPLAY, fontSize: 64, fontWeight: 300, letterSpacing: -2, lineHeight: 1, textAlign: "center", outline: "none", fontVariantNumeric: "tabular-nums", textShadow: "0 0 34px rgba(232,255,71,.45)" },
  kgUnit: { fontSize: 18, fontWeight: 500, color: C.midGray }, // NOVO
  kgAdjRow: { display: "flex", gap: 10, width: "100%", marginTop: 4 }, // NOVO
  kgAdjBtn: { flex: 1, padding: "16px 0", background: "rgba(255,255,255,.06)", border: `1px solid ${C.bgHeader}`, color: C.white, borderRadius: 14, fontFamily: DISPLAY, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  kgPresetRow: { display: "flex", gap: 8, width: "100%", marginTop: 10 }, // NOVO
  kgPreset: { flex: 1, padding: "11px 0", background: "transparent", border: `1px solid ${C.accentEdge}`, color: C.accent, borderRadius: 11, fontFamily: DISPLAY, fontSize: 12, fontWeight: 500, cursor: "pointer" }, // NOVO
  kgPresetActive: { background: C.accentSoft, border: `1px solid rgba(232,255,71,.5)`, fontWeight: 600 }, // NOVO
  unitHint: { fontSize: 11, color: C.midGray, textAlign: "center", marginBottom: 14, letterSpacing: 0.3 },
  metaRow: { display: "flex", gap: 10, margin: "16px 20px 0" }, // NOVO
  metaCell: { flex: 1, padding: "16px 14px", background: "rgba(255,255,255,.035)", border: `1px solid ${C.line}`, borderRadius: 18, display: "flex", flexDirection: "column", gap: 5 }, // NOVO
  metaLabel: { fontSize: 9.5, letterSpacing: 1.4, color: C.midGray }, // NOVO
  metaValue: { fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }, // NOVO
  confirmBtn: { width: "100%", padding: 19, background: G.lime, color: "#0A0A0B", border: "none", borderRadius: 16, fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: G.glowBtn },
  ghostBtn: { width: "100%", padding: 15, background: "transparent", border: "1px solid rgba(255,255,255,.12)", color: C.lightGray, borderRadius: 14, fontFamily: DISPLAY, fontSize: 13, fontWeight: 500, cursor: "pointer" }, // NOVO

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
  skipBtn: { marginTop: 26, background: "transparent", border: "1px solid rgba(255,255,255,.14)", color: C.lightGray, borderRadius: 14, padding: "14px 34px", fontSize: 13, fontWeight: 500, cursor: "pointer" },

  // ── Próximos ────────────────────────────────────────────
  upcomingSection: { margin: "30px 26px 0" },
  upcomingHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  upcomingLabel: { fontSize: 10, fontWeight: 600, letterSpacing: 2.4, color: C.midGray },
  upcomingCount: { fontSize: 10, fontWeight: 500, letterSpacing: 1.4, color: C.faint },
  upcomingList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 210, overflowY: "auto", maskImage: "linear-gradient(#000 80%, transparent)", WebkitMaskImage: "linear-gradient(#000 80%, transparent)" } as CSSProperties,
  upcomingItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,.04)", border: `1px solid ${C.line}`, borderRadius: 14, transition: `opacity .4s ${EASE}` },
  upcomingNum: { width: 16, flexShrink: 0, fontFamily: DISPLAY, fontSize: 11, fontWeight: 500, color: C.faint, fontVariantNumeric: "tabular-nums" },
  upcomingInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  upcomingName: { fontSize: 13.5, fontWeight: 500 },
  upcomingMeta: { fontSize: 11, color: C.midGray },
  upcomingPlay: { width: 30, height: 30, borderRadius: 10, background: "rgba(255,255,255,.05)", border: `1px solid ${C.bgHeader}`, color: C.accent, fontSize: 11, cursor: "pointer", flexShrink: 0 },

  // ── Histórico ───────────────────────────────────────────
  topNav: { padding: "26px 26px 0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  backBtn: { background: "transparent", border: "none", color: C.midGray, fontSize: 11, letterSpacing: 1.2, fontWeight: 500, cursor: "pointer", padding: 0 },
  histBody: { padding: "24px 26px 0" },
  histTitle: { fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 18px" },
  filterRow: { display: "flex", gap: 8, marginBottom: 24 }, // NOVO
  filterChip: { padding: "8px 14px", background: "rgba(255,255,255,.04)", border: `1px solid ${C.bgHeader}`, color: C.midGray, borderRadius: 11, fontSize: 12, cursor: "pointer" }, // NOVO
  filterChipActive: { background: C.accentSoft, border: `1px solid rgba(232,255,71,.45)`, color: C.accent, fontWeight: 600 }, // NOVO
  emptyState: { textAlign: "center", padding: "60px 20px", color: C.midGray, fontSize: 13.5, lineHeight: 1.6 },
  groupHeader: { display: "flex", alignItems: "center", gap: 9, marginBottom: 10 },
  groupName: { fontSize: 9.5, letterSpacing: 1.8, color: C.faint, textTransform: "uppercase" },
  groupRule: { flex: 1, height: 1, background: C.line },
  groupCount: { fontSize: 10.5, color: C.faint, letterSpacing: 0.8 },
  histEntry: { display: "flex", alignItems: "center", gap: 14, width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px", marginBottom: 10, color: C.white, fontSize: 13.5, cursor: "pointer", textAlign: "left" },
  histEntryBadge: { width: 40, height: 40, flexShrink: 0, borderRadius: 13, background: "rgba(255,255,255,.06)", color: C.midGray, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: 15, fontWeight: 700 }, // NOVO
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
  histSetBadge: { flex: 1, textAlign: "center", background: "rgba(255,255,255,.05)", border: `1px solid ${C.bgHeader}`, borderRadius: 10, padding: "9px 0", fontSize: 11.5, fontVariantNumeric: "tabular-nums" },
  histSetLabel: { fontSize: 9.5, color: C.midGray, fontWeight: 500, letterSpacing: 0.6 },
  histSetKg: { fontFamily: DISPLAY, fontSize: 11.5, fontWeight: 600, color: C.white },

  // ── Conclusão ───────────────────────────────────────────
  doneWrap: { minHeight: "100vh", background: G.screenDone, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px", textAlign: "center" },
  doneBadgeWrap: { position: "relative", width: 112, height: 112, display: "flex", alignItems: "center", justifyContent: "center" },
  doneGlow: { position: "absolute", inset: 0, borderRadius: "50%", background: C.accent, filter: "blur(22px)", opacity: 0.28, animation: "tabGlowBreathe 3.2s ease-in-out infinite" },
  doneCheck: { width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(232,255,71,.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: C.accent, animation: `tabPopIn .7s ${EASE} both` },
  doneTitle: { fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.16, margin: "28px 0 0" },
  doneSub: { color: C.midGray, fontSize: 12.5, margin: "12px 0 0" },
  doneStats: { display: "flex", gap: 10, width: "100%", marginTop: 34 },
  doneStat: { ...glass, flex: 1, borderRadius: 18, padding: "18px 8px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" },
  doneStatValue: { fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, color: C.accent, lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  doneStatLabel: { fontSize: 9, color: C.midGray, letterSpacing: 1.3 },
  doneChart: { display: "flex", alignItems: "flex-end", gap: 8, height: 72, marginTop: 30 }, // NOVO
  doneBar: { width: 15, borderRadius: 4, background: "rgba(255,255,255,.1)", transformOrigin: "bottom" }, // NOVO
  doneBarLast: { background: G.limeBar, boxShadow: "0 0 20px rgba(232,255,71,.45)" }, // NOVO
  doneBtn: { width: "100%", marginTop: 34, background: G.lime, color: "#0A0A0B", border: "none", borderRadius: 16, padding: 18, fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: G.glowBtn },

  // ── Programa / fases / exercícios ───────────────────────
  sectionLabel: { fontSize: 9.5, letterSpacing: 1.8, color: C.faint, marginBottom: 10 }, // NOVO
  phaseCard: { padding: "18px 20px", background: "rgba(255,255,255,.04)", border: `1px solid ${C.bgHeader}`, borderRadius: 20, display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }, // NOVO
  phaseCardActive: { background: G.glassActive, border: `1px solid rgba(232,255,71,.26)`, gap: 12 }, // NOVO
  phaseName: { fontFamily: DISPLAY, fontSize: 15, fontWeight: 600 }, // NOVO
  phaseMeta: { fontSize: 11.5, color: C.midGray }, // NOVO
  phaseWeeksRow: { display: "flex", gap: 4 }, // NOVO
  phaseWeek: { flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,.1)" }, // NOVO
  phaseWeekDone: { background: C.accent }, // NOVO
  rowItem: { display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", background: "rgba(255,255,255,.04)", border: `1px solid ${C.line}`, borderRadius: 16, marginBottom: 8, cursor: "pointer" }, // NOVO
  rowItemActive: { background: C.bgCard, border: `1px solid ${C.bgHeader}` }, // NOVO
  dragHandle: { fontSize: 14, color: "#4E4E48", letterSpacing: 1, cursor: "grab" }, // NOVO
  numField: { flex: 1, padding: "11px 12px", background: "rgba(255,255,255,.05)", border: `1px solid ${C.bgHeader}`, borderRadius: 12, display: "flex", flexDirection: "column", gap: 3 }, // NOVO
  numFieldLabel: { fontSize: 8.5, letterSpacing: 1.2, color: C.midGray }, // NOVO
  numFieldValue: { fontFamily: DISPLAY, fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", background: "transparent", border: "none", color: C.white, outline: "none", width: "100%", padding: 0 }, // NOVO
  addBtn: { width: "100%", padding: 16, background: "transparent", border: `1px dashed ${C.accentEdge}`, color: C.accent, borderRadius: 14, fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, cursor: "pointer" }, // NOVO
  searchField: { width: "100%", padding: "14px 16px", background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 14, fontSize: 13, color: C.white, outline: "none" }, // NOVO
  libRow: { display: "flex", alignItems: "center", gap: 14, padding: "15px 0", borderBottom: `1px solid ${C.line}` }, // NOVO
  libAdd: { width: 26, height: 26, borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: C.midGray, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer" }, // NOVO
  libAddActive: { background: C.accentSoft, border: `1px solid rgba(232,255,71,.4)`, color: C.accent }, // NOVO

  // ── Progresso ───────────────────────────────────────────
  chartCard: { ...glass, margin: "24px 20px 0", borderRadius: 24, padding: "22px 20px 18px" }, // NOVO
  chartValue: { fontFamily: DISPLAY, fontSize: 34, fontWeight: 600, color: C.accent, lineHeight: 1, fontVariantNumeric: "tabular-nums", textShadow: "0 0 30px rgba(232,255,71,.35)" }, // NOVO
  chartDelta: { marginLeft: "auto", fontSize: 11.5, color: C.accent }, // NOVO
  chartAxis: { display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.faint, marginTop: 6 }, // NOVO

  // ── Login ───────────────────────────────────────────────
  loginWrap: { minHeight: "100vh", background: "radial-gradient(120% 60% at 50% 100%, #1F1F18 0%, #08080A 60%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 28px 54px" }, // NOVO
  loginMark: { width: 48, height: 48, borderRadius: 16, background: G.lime, color: "#0A0A0B", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, boxShadow: "0 0 32px rgba(232,255,71,.35)" }, // NOVO
  loginTitle: { fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, letterSpacing: -0.6, lineHeight: 1.14, margin: "26px 0 0" }, // NOVO
  loginSub: { fontSize: 13, color: C.midGray, margin: "12px 0 0", lineHeight: 1.5 }, // NOVO
  field: { padding: "16px 18px", background: C.bgCard, border: `1px solid ${C.bgHeader}`, borderRadius: 16, display: "flex", flexDirection: "column", gap: 5 }, // NOVO
  fieldFocused: { border: `1px solid ${C.accentEdge}`, boxShadow: "0 0 0 3px rgba(232,255,71,.07)" }, // NOVO
  fieldLabel: { fontSize: 9.5, letterSpacing: 1.4, color: C.midGray }, // NOVO
  fieldInput: { fontSize: 14, color: C.lightGray, background: "transparent", border: "none", outline: "none", padding: 0, fontFamily: BODY }, // NOVO

  // ── Conflito de sessão ──────────────────────────────────
  scrim: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", zIndex: 40 }, // NOVO
  sheet: { margin: "0 14px 14px", padding: "30px 26px 26px", background: "rgba(22,22,20,.92)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 30, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 30px 70px -30px rgba(0,0,0,.95)", animation: `tabFadeUp .4s ${EASE} both`, width: "100%" }, // NOVO
  sheetIcon: { width: 44, height: 44, borderRadius: 14, background: C.accentSoft, border: `1px solid rgba(232,255,71,.4)`, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600 }, // NOVO
  sheetTitle: { fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: -0.3, lineHeight: 1.24, margin: "20px 0 0" }, // NOVO
  sheetBody: { fontSize: 13, color: C.midGray, margin: "10px 0 0", lineHeight: 1.55 }, // NOVO

  loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.midGray, fontSize: 13 },
};
