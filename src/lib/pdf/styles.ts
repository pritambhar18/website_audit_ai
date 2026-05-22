// src/lib/pdf/styles.ts — Shared PDF styles and colors
import { StyleSheet } from "@react-pdf/renderer";

export const C = {
  primary:     "#4f46e5", primaryLight: "#e0e7ff",
  critical:    "#dc2626", criticalBg:   "#fef2f2", criticalBorder: "#fca5a5",
  high:        "#ea580c", highBg:       "#fff7ed", highBorder:     "#fdba74",
  medium:      "#ca8a04", mediumBg:     "#fefce8", mediumBorder:   "#fde047",
  low:         "#2563eb", lowBg:        "#eff6ff", lowBorder:      "#93c5fd",
  pass:        "#16a34a", passBg:       "#f0fdf4", passBorder:     "#86efac",
  dark:        "#0f172a", navy:         "#1e293b",
  gray900:     "#111827", gray700: "#374151", gray600: "#4b5563",
  gray500:     "#6b7280", gray400: "#9ca3af", gray300: "#d1d5db",
  gray200:     "#e5e7eb", gray100: "#f3f4f6", gray50:  "#f9fafb",
  white:       "#ffffff", bg:      "#f8fafc",
  infoBlue:    "#1d4ed8", infoBg:  "#eff6ff", infoBorder: "#bfdbfe",
  warnAmber:   "#92400e", warnBg:  "#fffbeb", warnBorder: "#fcd34d",
};

// Priority label colors
export const PRIORITY: Record<string, { bg: string; text: string }> = {
  P1: { bg: "#dc2626", text: "#ffffff" },
  P2: { bg: "#ea580c", text: "#ffffff" },
  P3: { bg: "#ca8a04", text: "#ffffff" },
  P4: { bg: "#2563eb", text: "#ffffff" },
};

export const s = StyleSheet.create({
  // ── Page ──────────────────────────────────────────────────────────────
  page:        { fontFamily: "Helvetica", backgroundColor: C.bg, padding: 36, fontSize: 9, color: C.gray700 },
  coverPage:   { fontFamily: "Helvetica", backgroundColor: C.dark, padding: 50, flexDirection: "column", justifyContent: "center" },
  pageNum:     { position: "absolute", bottom: 16, right: 36, fontSize: 7, color: C.gray400 },

  // ── Cover ────────────────────────────────────────────────────────────
  coverTitle:     { fontSize: 28, fontWeight: 700, color: C.white, marginBottom: 6 },
  coverSub:       { fontSize: 13, color: "#a5b4fc", marginBottom: 30 },
  coverUrl:       { fontSize: 11, color: "#c7d2fe", backgroundColor: "#1e1b4b", padding: "6 10", borderRadius: 4, marginBottom: 6 },
  coverMeta:      { fontSize: 9, color: C.gray500, marginTop: 30 },
  coverBadge:     { fontSize: 8, color: "#a5b4fc", backgroundColor: "#312e81", padding: "3 8", borderRadius: 10, marginBottom: 16, alignSelf: "flex-start" },
  coverDivider:   { borderTop: `1 solid #312e81`, marginVertical: 20 },

  // ── Section headers ──────────────────────────────────────────────────
  sectionTitle:   { fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 4, paddingBottom: 6, borderBottom: `2 solid ${C.primary}` },
  sectionDesc:    { fontSize: 8, color: C.gray500, marginBottom: 10, lineHeight: 1.5 },
  sectionNumber:  { fontSize: 8, color: C.primary, fontWeight: 700, marginBottom: 2 },

  // ── Info / Tip box ───────────────────────────────────────────────────
  infoBox:        { backgroundColor: C.infoBg, border: `1 solid ${C.infoBorder}`, borderRadius: 4, padding: "6 10", marginBottom: 8, flexDirection: "row", gap: 6 },
  infoBoxText:    { fontSize: 7.5, color: C.infoBlue, lineHeight: 1.5, flex: 1 },
  infoBoxIcon:    { fontSize: 9, color: C.infoBlue, marginTop: 1 },
  warnBox:        { backgroundColor: C.warnBg, border: `1 solid ${C.warnBorder}`, borderRadius: 4, padding: "6 10", marginBottom: 8, flexDirection: "row", gap: 6 },
  warnBoxText:    { fontSize: 7.5, color: C.warnAmber, lineHeight: 1.5, flex: 1 },

  // ── Tables ───────────────────────────────────────────────────────────
  tableHeader:    { flexDirection: "row", backgroundColor: C.navy, borderRadius: 3, padding: "5 8", marginBottom: 2 },
  tableHeaderCell:{ fontSize: 7, fontWeight: 700, color: C.white, textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow:       { flexDirection: "row", padding: "5 8", borderBottom: `1 solid ${C.gray200}`, backgroundColor: C.white },
  tableRowAlt:    { flexDirection: "row", padding: "5 8", borderBottom: `1 solid ${C.gray200}`, backgroundColor: C.gray50 },
  tableCell:      { fontSize: 8, color: C.gray700 },

  // ── Checkpoint rows ──────────────────────────────────────────────────
  checkRow:       { flexDirection: "row", padding: "6 8", borderBottom: `1 solid ${C.gray200}`, alignItems: "flex-start", backgroundColor: C.white },
  checkRowAlt:    { flexDirection: "row", padding: "6 8", borderBottom: `1 solid ${C.gray200}`, alignItems: "flex-start", backgroundColor: C.gray50 },
  checkRowFail:   { flexDirection: "row", padding: "6 8", borderBottom: `1 solid ${C.gray200}`, alignItems: "flex-start", backgroundColor: "#fff5f5" },

  // ── Metric cards ─────────────────────────────────────────────────────
  metricsRow:     { flexDirection: "row", gap: 6, marginBottom: 10 },
  metricBox:      { flex: 1, backgroundColor: C.white, borderRadius: 6, padding: 10, border: `1 solid ${C.gray200}`, alignItems: "center" },
  metricVal:      { fontSize: 18, fontWeight: 700, color: C.dark },
  metricLbl:      { fontSize: 7, color: C.gray500, marginTop: 2, textAlign: "center" },

  // ── Issue blocks ─────────────────────────────────────────────────────
  issueRow:       { borderRadius: 4, padding: 8, marginBottom: 6, borderLeft: "3 solid" },
  issueMeta:      { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4, flexWrap: "wrap" },
  issueTitle:     { fontSize: 9, fontWeight: 700, color: C.dark },
  issueWhat:      { fontSize: 7.5, color: C.gray600, marginBottom: 4, lineHeight: 1.4 },
  issueDesc:      { fontSize: 8, color: C.gray600, marginBottom: 4, lineHeight: 1.4 },
  issueRec:       { fontSize: 8, color: C.primary, fontStyle: "italic", lineHeight: 1.4 },
  issueUrl:       { fontSize: 7, color: C.gray400, fontStyle: "italic", marginTop: 2 },
  issueImpact:    { fontSize: 7.5, color: C.gray500, marginBottom: 3, lineHeight: 1.4 },

  // ── Chips / badges ───────────────────────────────────────────────────
  chip:           { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, fontSize: 7, fontWeight: 700, color: C.white },
  priorityChip:   { borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, fontSize: 6.5, fontWeight: 700, color: C.white },
  passChip:       { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, fontSize: 7, fontWeight: 700, color: C.white, backgroundColor: C.pass },
  deviceChip:     { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, fontSize: 6.5, fontWeight: 700, color: C.white, backgroundColor: "#7c3aed" },
  categoryChip:   { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, fontSize: 6.5, fontWeight: 700, color: C.white, backgroundColor: "#0369a1" },

  // ── Device cards ─────────────────────────────────────────────────────
  deviceGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  deviceCard:     { width: "31%", backgroundColor: C.white, borderRadius: 6, border: `1 solid ${C.gray200}`, overflow: "hidden" },
  deviceCardPass: { width: "31%", backgroundColor: C.passBg, borderRadius: 6, border: `1 solid ${C.passBorder}`, overflow: "hidden" },
  deviceCardFail: { width: "31%", backgroundColor: "#fff5f5", borderRadius: 6, border: `1 solid ${C.criticalBorder}`, overflow: "hidden" },
  deviceImg:      { width: "100%", maxHeight: 120, borderBottom: `1 solid ${C.gray200}`, objectFit: "cover" },
  deviceInfoRow:  { padding: "5 6" },
  deviceName:     { fontSize: 7.5, fontWeight: 700, color: C.dark, marginBottom: 1 },
  deviceMeta:     { fontSize: 6.5, color: C.gray500 },
  deviceStatus:   { fontSize: 7, fontWeight: 700, marginTop: 2 },
  deviceLabel:    { fontSize: 7, color: C.gray500, textAlign: "center" },

  // ── Device issue section ─────────────────────────────────────────────
  deviceIssueHeader: { flexDirection: "row", alignItems: "center", gap: 4, padding: "5 8", backgroundColor: "#1e293b", borderRadius: "4 4 0 0" },
  deviceIssueBody:   { padding: "6 8", borderRadius: "0 0 4 4", border: `1 solid ${C.gray200}`, marginBottom: 8 },

  // ── Score badge ───────────────────────────────────────────────────────
  scoreBadge:     { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginRight: 10 },
  scoreNum:       { fontSize: 20, fontWeight: 700, color: C.white },
  scoreLabel:     { fontSize: 6, color: C.white, marginTop: 1 },

  // ── Divider ───────────────────────────────────────────────────────────
  divider:        { borderTop: `1 solid ${C.gray200}`, marginVertical: 10 },
  thickDivider:   { borderTop: `2 solid ${C.primary}`, marginVertical: 12 },

  // ── Helpers ───────────────────────────────────────────────────────────
  row:            { flexDirection: "row", alignItems: "center", gap: 6 },
  rowWrap:        { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  bold:           { fontWeight: 700 },
  small:          { fontSize: 8 },
  tiny:           { fontSize: 7 },
  muted:          { color: C.gray500 },
  flex1:          { flex: 1 },

  // ── Pass panel ────────────────────────────────────────────────────────
  passPanel:      { backgroundColor: C.passBg, border: `1 solid ${C.passBorder}`, borderRadius: 4, padding: "6 10", marginTop: 6 },
  passPanelText:  { fontSize: 8, color: C.pass, fontWeight: 700 },

  // ── Legend row ────────────────────────────────────────────────────────
  legendRow:      { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  legendItem:     { flexDirection: "row", alignItems: "center", gap: 3 },
  legendDot:      { width: 7, height: 7, borderRadius: 3.5 },
  legendText:     { fontSize: 7, color: C.gray600 },
});
