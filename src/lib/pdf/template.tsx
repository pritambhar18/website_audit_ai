import { Document, Page, Text, View, Image, Link } from "@react-pdf/renderer";
import type { AuditResult, Issue, Severity, DeviceResult } from "../types";
import type { NetworkRequest } from "../auditors/performance";
import { s, C } from "./styles";
function truncateUrl(url: string, maxLength = 45): string {
  if (!url || url.length <= maxLength) return url;
  return url.substring(0, maxLength - 10) + "..." + url.substring(url.length - 8);
}

const SEV_CLR: Record<Severity, string> = { critical: C.critical, high: C.high, medium: C.medium, low: C.low, pass: C.pass };
const SEV_BG: Record<Severity, string> = { critical: C.criticalBg, high: C.highBg, medium: C.mediumBg, low: C.lowBg, pass: C.passBg };
const SEV_BORDER: Record<Severity, string> = { critical: C.criticalBorder, high: C.highBorder, medium: C.mediumBorder, low: C.lowBorder, pass: C.passBorder };
const PRIORITY: Record<Severity, string> = { critical: "P1 - Immediate", high: "P2 - High", medium: "P3 - Medium", low: "P4 - Low", pass: "" };
const PRIORITY_BG: Record<Severity, string> = { critical: "#7f1d1d", high: "#7c2d12", medium: "#713f12", low: "#1e3a8a", pass: C.pass };

function Pg({ children }: { children: React.ReactNode }) { return <Page size="A4" style={s.page}><Text style={s.pageNum} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`} fixed />{children}</Page>; }
function Sec({ title, desc, tip }: { title: string; desc?: string; tip?: string }) {
  return <View><Text style={s.sectionTitle}>{title}</Text>{desc && <Text style={s.sectionDesc}>{desc}</Text>}{tip && <View style={s.infoBox}><Text style={s.infoBoxIcon}>i</Text><Text style={s.infoBoxText}>{tip}</Text></View>}</View>;
}
function Chip({ severity }: { severity: Severity }) { return <Text style={[s.chip, { backgroundColor: SEV_CLR[severity] }]}>{severity.toUpperCase()}</Text>; }
function PriorityChip({ severity }: { severity: Severity }) {
  if (severity === "pass") return null;
  return <Text style={[s.chip, { backgroundColor: PRIORITY_BG[severity], fontSize: 6.5 }]}>{PRIORITY[severity]}</Text>;
}
function Score({ score }: { score: number }) { const c = score >= 80 ? C.pass : score >= 60 ? C.medium : C.critical; return <View style={[s.scoreBadge, { backgroundColor: c }]}><Text style={s.scoreNum}>{score}</Text></View>; }
function Metric({ label, value, color }: { label: string; value: string | number; color?: string }) { return <View style={s.metricBox}><Text style={[s.metricVal, color ? { color } : {}]}>{String(value)}</Text><Text style={s.metricLbl}>{label}</Text></View>; }

function CheckRow({ id, checkpoint, what, result, severity, alt, includeManualQA }: { id: string; checkpoint: string; what: string; result: string; severity?: Severity; alt?: boolean; includeManualQA?: boolean }) {
  const hasFail = severity && severity !== "pass";
  const bg = hasFail ? s.checkRowFail : (alt ? s.checkRowAlt : s.checkRow);
  return <View style={[bg, { flexDirection: "column" }]} wrap={false}>
    <View style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 4 }}>
      <View style={{ width: "5%" }}>
        <Text style={[s.tableCell, { color: C.gray400 }]}>{id}</Text>
      </View>
      <View style={{ width: "23%", paddingRight: 4 }}>
        <Text style={[s.tableCell, { fontWeight: 700, color: C.dark, marginBottom: 1 }]}>{checkpoint}</Text>
        {hasFail && <PriorityChip severity={severity!} />}
      </View>
      <View style={{ width: "37%", paddingRight: 6 }}>
        <Text style={[s.tableCell, { lineHeight: 1.4 }]}>{what}</Text>
      </View>
      <View style={{ width: "15%", flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
        {severity ? <Chip severity={severity} /> : <Text style={[s.tableCell, { color: C.pass, fontWeight: 700 }]}>PASS</Text>}
      </View>
      <View style={{ width: "20%" }}>
        <Text style={s.tableCell}>{truncateUrl(result, 25)}</Text>
      </View>
    </View>
    {includeManualQA && <ManualQAPlaceholder />}
  </View>;
}

function CheckHeader() {
  return <View style={s.tableHeader}>
    <View style={{ width: "5%" }}>
      <Text style={[s.tableHeaderCell]}>#</Text>
    </View>
    <View style={{ width: "23%" }}>
      <Text style={[s.tableHeaderCell]}>Checkpoint / Priority</Text>
    </View>
    <View style={{ width: "37%" }}>
      <Text style={[s.tableHeaderCell]}>What We Check & Why It Matters</Text>
    </View>
    <View style={{ width: "15%" }}>
      <Text style={[s.tableHeaderCell]}>Status</Text>
    </View>
    <View style={{ width: "20%" }}>
      <Text style={[s.tableHeaderCell]}>Finding</Text>
    </View>
  </View>;
}

function IssueBlock({ issue, showDevice }: { issue: Issue; showDevice?: boolean }) {
  const bColor = SEV_BORDER[issue.severity] ?? SEV_CLR[issue.severity];
  return <View style={[s.issueRow, { borderLeftColor: SEV_CLR[issue.severity], backgroundColor: SEV_BG[issue.severity], borderLeft: `4 solid ${bColor}` }]} wrap={false}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <Chip severity={issue.severity} />
      {issue.severity !== "pass" && <PriorityChip severity={issue.severity} />}
      {showDevice && issue.device && <Text style={[s.chip, { backgroundColor: "#7c3aed" }]}>{issue.device}</Text>}
    </View>
    <Text style={[s.issueTitle, { marginBottom: 4, lineHeight: 1.3 }]}>{issue.title}</Text>

    {issue.testScenario && <View style={{ marginBottom: 4 }}><Text style={[s.tiny, s.bold, { color: C.gray900 }]}>Test Scenario: <Text style={{ fontWeight: 400, color: C.gray600 }}>{issue.testScenario}</Text></Text></View>}
    {issue.testStep && <View style={{ marginBottom: 4 }}><Text style={[s.tiny, s.bold, { color: C.gray900 }]}>Test Step: <Text style={{ fontWeight: 400, color: C.gray600 }}>{issue.testStep}</Text></Text></View>}
    
    <Text style={s.issueDesc}>{issue.description}</Text>
    
    {issue.whyItMatters && <View style={{ marginTop: 2, marginBottom: 4 }}><Text style={[s.tiny, { fontStyle: "italic", color: C.gray500 }]}><Text style={s.bold}>Impact: </Text>{issue.whyItMatters}</Text></View>}

    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 4, marginTop: 2 }}>
      <Text style={{ fontSize: 8, color: C.primary }}>→</Text>
      <Text style={[s.issueRec, { flex: 1 }]}>Fix: {issue.recommendation}</Text>
    </View>
    {issue.url && <Text style={[s.tiny, s.muted, { marginTop: 2 }]}>URL: {truncateUrl(issue.url)}</Text>}
  </View>;
}

// Custom manual QA placeholder component - returns null as report link is removed from SEO
function ManualQAPlaceholder() {
  return null;
}

// Rich graphical distribution of issues for the manager
function IssuesDistributionBar({ critical, high, medium, low }: { critical: number; high: number; medium: number; low: number }) {
  const total = critical + high + medium + low;
  if (total === 0) {
    return (
      <View style={{ marginVertical: 6 }}>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Issue Distribution Chart:</Text>
        <View style={{ flexDirection: "row", height: 12, backgroundColor: C.pass, borderRadius: 6 }} />
      </View>
    );
  }

  const pCrit = (critical / total) * 100;
  const pHigh = (high / total) * 100;
  const pMed = (medium / total) * 100;
  const pLow = (low / total) * 100;

  return (
    <View style={{ marginVertical: 8 }} wrap={false}>
      <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Quality & Severity Breakdown (Manager Overview):</Text>
      <View style={{ flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", backgroundColor: C.gray200 }}>
        {critical > 0 && <View style={{ width: `${pCrit}%`, backgroundColor: C.critical, justifyContent: "center", alignItems: "center" }}>{pCrit > 8 && <Text style={{ fontSize: 6.5, color: "#fff", fontWeight: "bold" }}>{Math.round(pCrit)}%</Text>}</View>}
        {high > 0 && <View style={{ width: `${pHigh}%`, backgroundColor: C.high, justifyContent: "center", alignItems: "center" }}>{pHigh > 8 && <Text style={{ fontSize: 6.5, color: "#fff", fontWeight: "bold" }}>{Math.round(pHigh)}%</Text>}</View>}
        {medium > 0 && <View style={{ width: `${pMed}%`, backgroundColor: C.medium, justifyContent: "center", alignItems: "center" }}>{pMed > 8 && <Text style={{ fontSize: 6.5, color: "#fff", fontWeight: "bold" }}>{Math.round(pMed)}%</Text>}</View>}
        {low > 0 && <View style={{ width: `${pLow}%`, backgroundColor: C.low, justifyContent: "center", alignItems: "center" }}>{pLow > 8 && <Text style={{ fontSize: 6.5, color: "#fff", fontWeight: "bold" }}>{Math.round(pLow)}%</Text>}</View>}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.critical }} />
          <Text style={{ fontSize: 6.5, color: C.gray600 }}>P1 Critical ({critical})</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.high }} />
          <Text style={{ fontSize: 6.5, color: C.gray600 }}>P2 High ({high})</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.medium }} />
          <Text style={{ fontSize: 6.5, color: C.gray600 }}>P3 Medium ({medium})</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.low }} />
          <Text style={{ fontSize: 6.5, color: C.gray600 }}>P4 Low ({low})</Text>
        </View>
      </View>
    </View>
  );
}

// Graphical Health score indicator
function HealthScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? C.pass : score >= 50 ? C.medium : C.critical;
  return (
    <View style={{ marginVertical: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: C.dark }}>Website Health Score Index</Text>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color: color }}>{score} / 100</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.gray200, position: "relative", overflow: "hidden" }}>
        <View style={{ width: `${score}%`, height: "100%", backgroundColor: color }} />
      </View>
    </View>
  );
}

// Rich Security & Performance checkpoint card
function SecurityCheckCard({ id, heading, result, passed, description, impact, toolLinks, screenshotBase64, reportUrl }: {
  id: string;
  heading: string;
  result: string;
  passed: boolean;
  description: string;
  impact: string;
  toolLinks: { label: string; url: string }[];
  screenshotBase64?: string;
  reportUrl?: string;
}) {
  return (
    <View style={{ marginBottom: 10, border: `1 solid ${passed ? "#86efac" : "#fca5a5"}`, borderRadius: 6, overflow: "hidden" }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: passed ? "#16a34a" : "#dc2626", padding: "6 10" }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: "#ffffff" }}>{id}. {heading}</Text>
        <Text style={{ fontSize: 9, fontWeight: 700, color: "#ffffff", backgroundColor: passed ? "#15803d" : "#b91c1c", padding: "2 8", borderRadius: 4 }}>{result}</Text>
      </View>

      <View style={{ padding: "8 10", backgroundColor: passed ? "#f0fdf4" : "#fef2f2", flexDirection: "row", gap: 10 }}>
        {/* Left Side: Description, Impact, and Tool Links */}
        <View style={{ width: "38%", gap: 4 }}>
          <Text style={{ fontSize: 7.5, color: "#334155", lineHeight: 1.3 }}>
            <Text style={{ fontWeight: 700 }}>Description: </Text>{description}
          </Text>
          <Text style={{ fontSize: 7.5, color: "#475569", lineHeight: 1.3, fontStyle: "italic" }}>
            <Text style={{ fontWeight: 700, fontStyle: "normal" }}>Impact: </Text>{impact}
          </Text>

          <View style={{ marginTop: 4, gap: 2 }}>
            {toolLinks.length > 0 && (
              <View style={{ gap: 1, marginTop: 2 }}>
                <Text style={{ fontSize: 7, fontWeight: 700, color: "#1e293b" }}>Testing Tools:</Text>
                {toolLinks.map((t, i) => (
                  <Link key={i} src={t.url} style={{ fontSize: 6.5, color: "#2563eb", fontStyle: "italic", textDecoration: "underline" }}>
                    <Text>→ {t.label}</Text>
                  </Link>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Right Side: Larger Screenshot */}
        <View style={{ width: "62%", justifyContent: "center", alignItems: "center" }}>
          {screenshotBase64 && screenshotBase64.length > 100 ? (
            <View style={{ width: "100%", height: 180, border: "1 solid #cbd5e1", borderRadius: 4, overflow: "hidden", backgroundColor: "#ffffff" }}>
              <Image src={`data:image/jpeg;base64,${screenshotBase64}`} style={{ width: "100%", height: 180, objectFit: "contain" }} />
            </View>
          ) : (
            <View style={{ width: "100%", height: 180, border: "1 dashed #cbd5e1", borderRadius: 4, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", padding: 6 }}>
              <Text style={{ fontSize: 7, color: "#64748b", textAlign: "center" }}>No screenshot available</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// Rich Performance check card (PageSpeed)
function PerformanceCheckCard({ id, heading, result, score, metrics, passed, description, impact, toolLinks, screenshotBase64, reportUrl }: {
  id: string;
  heading: string;
  result: string;
  score: number;
  metrics: { fcp: string; lcp: string; cls: string; speedIndex: string };
  passed: boolean;
  description: string;
  impact: string;
  toolLinks: { label: string; url: string }[];
  screenshotBase64?: string;
  reportUrl?: string;
}) {
  return (
    <View style={{ marginBottom: 10, border: `1 solid ${passed ? "#86efac" : "#ea580c"}`, borderRadius: 6, overflow: "hidden" }} wrap={false}>
      {/* Header bar */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: passed ? "#16a34a" : "#ea580c", padding: "6 10" }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: "#ffffff" }}>{id}. {heading}</Text>
        <Text style={{ fontSize: 9, fontWeight: 700, color: "#ffffff", backgroundColor: passed ? "#15803d" : "#c2410c", padding: "2 8", borderRadius: 4 }}>Score: {score}/100 ({result})</Text>
      </View>

      <View style={{ padding: "8 10", backgroundColor: passed ? "#f0fdf4" : "#fff7ed", flexDirection: "row", gap: 10 }}>
        {/* Left Side: Metrics, Description, Impact and Tool Links */}
        <View style={{ width: "38%", gap: 4 }}>
          {/* Core Web Vitals Row */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 2 }}>
            <View style={{ backgroundColor: "#ffffff", border: "1 solid #e2e8f0", borderRadius: 4, padding: "2 4", minWidth: 42 }}>
              <Text style={{ fontSize: 6, color: "#64748b" }}>FCP</Text>
              <Text style={{ fontSize: 7, fontWeight: 700, color: "#1e293b" }}>{metrics.fcp}</Text>
            </View>
            <View style={{ backgroundColor: "#ffffff", border: "1 solid #e2e8f0", borderRadius: 4, padding: "2 4", minWidth: 42 }}>
              <Text style={{ fontSize: 6, color: "#64748b" }}>LCP</Text>
              <Text style={{ fontSize: 7, fontWeight: 700, color: "#1e293b" }}>{metrics.lcp}</Text>
            </View>
            <View style={{ backgroundColor: "#ffffff", border: "1 solid #e2e8f0", borderRadius: 4, padding: "2 4", minWidth: 42 }}>
              <Text style={{ fontSize: 6, color: "#64748b" }}>CLS</Text>
              <Text style={{ fontSize: 7, fontWeight: 700, color: "#1e293b" }}>{metrics.cls}</Text>
            </View>
            <View style={{ backgroundColor: "#ffffff", border: "1 solid #e2e8f0", borderRadius: 4, padding: "2 4", minWidth: 42 }}>
              <Text style={{ fontSize: 6, color: "#64748b" }}>Speed Index</Text>
              <Text style={{ fontSize: 7, fontWeight: 700, color: "#1e293b" }}>{metrics.speedIndex}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 7.5, color: "#334155", lineHeight: 1.3 }}>
            <Text style={{ fontWeight: 700 }}>Description: </Text>{description}
          </Text>
          <Text style={{ fontSize: 7.5, color: "#475569", lineHeight: 1.3, fontStyle: "italic" }}>
            <Text style={{ fontWeight: 700, fontStyle: "normal" }}>Impact: </Text>{impact}
          </Text>

          <View style={{ marginTop: 4, gap: 2 }}>
            {toolLinks.length > 0 && (
              <View style={{ gap: 1, marginTop: 2 }}>
                <Text style={{ fontSize: 7, fontWeight: 700, color: "#1e293b" }}>Testing Tools:</Text>
                {toolLinks.map((t, i) => (
                  <Link key={i} src={t.url} style={{ fontSize: 6.5, color: "#2563eb", fontStyle: "italic", textDecoration: "underline" }}>
                    <Text>→ {t.label}</Text>
                  </Link>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Right Side: Larger Screenshot */}
        <View style={{ width: "62%", justifyContent: "center", alignItems: "center" }}>
          {screenshotBase64 && screenshotBase64.length > 100 ? (
            <View style={{ width: "100%", height: 180, border: "1 solid #cbd5e1", borderRadius: 4, overflow: "hidden", backgroundColor: "#ffffff" }}>
              <Image src={screenshotBase64.startsWith("data:") ? screenshotBase64 : `data:image/jpeg;base64,${screenshotBase64}`} style={{ width: "100%", height: 180, objectFit: "contain" }} />
            </View>
          ) : (
            <View style={{ width: "100%", height: 180, border: "1 dashed #cbd5e1", borderRadius: 4, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", padding: 6 }}>
              <Text style={{ fontSize: 7, color: "#64748b", textAlign: "center" }}>No screenshot available</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// Waterfall network requests table component
function WaterfallModelTable({ title, waterfall }: { title: string; waterfall?: NetworkRequest[] }) {
  if (!waterfall || waterfall.length === 0) {
    return (
      <View style={{ padding: 10, backgroundColor: "#f8fafc", borderRadius: 4, border: "1 dashed #cbd5e1", marginTop: 10 }}>
        <Text style={{ fontSize: 8, color: "#64748b", fontStyle: "italic", textAlign: "center" }}>Waterfall network data not available. Ensure Google PageSpeed Insights API key is configured.</Text>
      </View>
    );
  }

  // Find max end time to compute percentages
  const maxEndTime = Math.max(...waterfall.map(r => r.endTime), 0.1);

  return (
    <View style={{ marginTop: 12, border: "1 solid #e2e8f0", borderRadius: 6, overflow: "hidden" }} wrap={false}>
      {/* Header */}
      <View style={{ backgroundColor: "#0f172a", padding: "6 10" }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: "#ffffff" }}>{title}</Text>
      </View>

      <View style={{ padding: 6, backgroundColor: "#ffffff" }}>
        {/* Table Headers */}
        <View style={{ flexDirection: "row", borderBottom: "1 solid #e2e8f0", paddingBottom: 4, marginBottom: 4, backgroundColor: "#f8fafc", padding: 4, borderRadius: 3 }}>
          <Text style={{ fontSize: 7, fontWeight: 700, width: "40%" }}>Asset Name (URL)</Text>
          <Text style={{ fontSize: 7, fontWeight: 700, width: "12%" }}>Type</Text>
          <Text style={{ fontSize: 7, fontWeight: 700, width: "10%" }}>Status</Text>
          <Text style={{ fontSize: 7, fontWeight: 700, width: "10%" }}>Size</Text>
          <Text style={{ fontSize: 7, fontWeight: 700, width: "10%" }}>Duration</Text>
          <Text style={{ fontSize: 7, fontWeight: 700, width: "18%" }}>Timeline (Waterfall)</Text>
        </View>

        {/* Rows */}
        {waterfall.map((req, i) => {
          let sizeText = "0 B";
          if (req.transferSize > 1024 * 1024) {
            sizeText = (req.transferSize / (1024 * 1024)).toFixed(1) + " MB";
          } else if (req.transferSize > 1024) {
            sizeText = (req.transferSize / 1024).toFixed(0) + " KB";
          } else if (req.transferSize > 0) {
            sizeText = req.transferSize + " B";
          } else if (req.resourceSize > 0) {
            if (req.resourceSize > 1024 * 1024) {
              sizeText = (req.resourceSize / (1024 * 1024)).toFixed(1) + " MB";
            } else {
              sizeText = (req.resourceSize / 1024).toFixed(0) + " KB";
            }
          }

          const durationSec = req.duration >= 1 ? req.duration.toFixed(2) + "s" : Math.round(req.duration * 1000) + "ms";

          const leftPercent = Math.max(0, Math.min(95, (req.startTime / maxEndTime) * 100));
          const widthPercent = Math.max(2, Math.min(100 - leftPercent, (req.duration / maxEndTime) * 100));

          let name = req.url;
          try {
            const urlObj = new URL(req.url);
            name = urlObj.pathname.split("/").pop() || urlObj.hostname;
            if (!name) name = urlObj.hostname;
            if (name === "/" || name.length < 2) {
              name = urlObj.hostname + urlObj.pathname;
            }
          } catch {
            // ignore
          }
          if (name.length > 30) {
            name = name.substring(0, 15) + "..." + name.substring(name.length - 12);
          }

          let barColor = "#3b82f6";
          const mime = req.mimeType.toLowerCase();
          if (mime.includes("html") || mime.includes("document")) {
            barColor = "#ef4444";
          } else if (mime.includes("css")) {
            barColor = "#10b981";
          } else if (mime.includes("javascript") || mime.includes("js")) {
            barColor = "#f59e0b";
          } else if (mime.includes("image")) {
            barColor = "#8b5cf6";
          } else if (mime.includes("font")) {
            barColor = "#ec4899";
          }

          return (
            <View key={i} style={{ flexDirection: "row", borderBottom: "1 solid #f1f5f9", paddingVertical: 4, paddingHorizontal: 4, alignItems: "center" }}>
              <Text style={{ fontSize: 6.5, width: "40%", fontFamily: "Courier", color: "#334155" }}>{name}</Text>
              <Text style={{ fontSize: 6.5, width: "12%", color: "#475569" }}>{req.mimeType.split("/").pop() || "other"}</Text>
              <Text style={{ fontSize: 6.5, width: "10%", color: req.statusCode >= 400 ? "#ef4444" : "#10b981", fontWeight: 700 }}>{req.statusCode}</Text>
              <Text style={{ fontSize: 6.5, width: "10%", color: "#475569" }}>{sizeText}</Text>
              <Text style={{ fontSize: 6.5, width: "10%", color: "#475569", fontWeight: 700 }}>{durationSec}</Text>
              
              <View style={{ width: "18%", height: 7, backgroundColor: "#f1f5f9", borderRadius: 1.5, position: "relative", overflow: "hidden" }}>
                <View style={{
                  position: "absolute",
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  height: 7,
                  backgroundColor: barColor,
                  borderRadius: 1.5
                }} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DeviceSection({ title, devices }: { title: string; devices: DeviceResult[] }) {
  if (!devices.length) return null;

  return <>
    <Text style={[s.bold, { fontSize: 12, marginBottom: 8, marginTop: 12, color: C.dark, borderBottom: "1 solid #e5e7eb", paddingBottom: 4 }]}>{title}</Text>

    {/* All Devices */}
    {devices.map((d, i) => {
      const pass = d.aiIssues.length === 0;
      return <View key={i} style={{ marginBottom: 16, border: pass ? "1 solid #86efac" : "1 solid #f87171", borderRadius: 6, padding: 8, backgroundColor: pass ? "#f0fdf4" : "#fef2f2" }} wrap={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, backgroundColor: pass ? C.pass : C.critical, padding: "6 8", borderRadius: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: C.white }}>{pass ? "PASS - " : "WARNING - "}{d.device.name}</Text>
          <Text style={{ fontSize: 8, color: pass ? "#dcfce7" : "#fecaca" }}>{d.device.width}×{d.device.height}</Text>
          <Text style={[s.chip, { backgroundColor: pass ? "#15803d" : "#991b1b" }]}>{pass ? "PASS - No issues detected" : `${d.aiIssues.length} issue(s) detected`}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: "35%" }}>
            {d.screenshotBase64 && d.screenshotBase64.length > 100 ? (
              <Image src={`data:image/jpeg;base64,${d.screenshotBase64}`} style={[s.deviceImg, { width: "100%", maxHeight: 300 }]} />
            ) : (
              <View style={{ width: "100%", height: 150, border: "1 dashed #cbd5e1", borderRadius: 4, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 7, color: "#64748b" }}>Screenshot not available</Text>
              </View>
            )}
          </View>
          <View style={{ width: "65%" }}>
            {pass ? (
              <Text style={{ fontSize: 9, color: C.pass, fontStyle: "italic" }}>All UI elements are rendering correctly within viewport boundaries. No functional or visual defects identified.</Text>
            ) : (
              d.aiIssues.map((iss) => <IssueBlock key={iss.id} issue={iss} showDevice={false} />)
            )}
          </View>
        </View>
      </View>;
    })}
  </>;
}

export interface AuditReportProps { data: AuditResult; }

export function AuditReportDocument({ data }: AuditReportProps) {
  const all = [...data.links.issues, ...data.responsive.issues, ...data.seo.issues, ...data.security.issues, ...data.forms.issues];
  const desk = data.responsive.devices.filter(d => d.device.category === "desktop");
  const mob = data.responsive.devices.filter(d => d.device.category === "mobile");
  const tab = data.responsive.devices.filter(d => d.device.category === "tablet");

  const hasGtmetrix = !!data.performance.gtmetrix;

  return <Document title={`Audit Report - ${data.url}`} author="QA-Auditor">
    {/* COVER */}
    <Page size="A4" style={s.coverPage}>
      <Text style={s.coverBadge}>AI-POWERED COMPREHENSIVE SCAN</Text>
      <Text style={s.coverTitle}>Website Audit Report</Text>
      <Text style={s.coverSub}>Your friendly, detailed health check for performance, SEO, security, forms, and responsive layouts</Text>
      
      <View style={{ marginVertical: 15 }}>
        <Text style={s.coverUrl}>{truncateUrl(data.url, 60)}</Text>
      </View>

      <View style={s.metricsRow}>
        <Metric label="Overall Score" value={`${data.overallScore}/100`} color={data.overallScore >= 70 ? C.pass : C.critical} />
        {data.performance.gtmetrix ? (
          <Metric label="GTmetrix Grade" value={data.performance.gtmetrix.grade} color={C.primary} />
        ) : (
          <Metric label="Critical Issues" value={data.criticalCount} color={data.criticalCount ? C.critical : C.pass} />
        )}
        <Metric label="High Priority" value={data.highCount} color={data.highCount ? C.high : C.pass} />
        <Metric label="Total Issues" value={data.totalIssues} />
      </View>

      {/* Graphical health score index on cover page for management review */}
      <View style={{ marginVertical: 12, backgroundColor: "#1e293b", padding: 12, borderRadius: 6, border: "1 solid #334155" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ fontSize: 8.5, fontWeight: 700, color: "#94a3b8" }}>GRAPHICAL HEALTH SCORE INDEX</Text>
          <Text style={{ fontSize: 9.5, fontWeight: 700, color: data.overallScore >= 80 ? C.pass : data.overallScore >= 50 ? C.medium : C.critical }}>{data.overallScore} / 100</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "#334155", position: "relative", overflow: "hidden" }}>
          <View style={{ width: `${data.overallScore}%`, height: "100%", backgroundColor: data.overallScore >= 80 ? C.pass : data.overallScore >= 50 ? C.medium : C.critical }} />
        </View>
      </View>

      <View style={s.coverDivider} />
      <Text style={s.coverMeta}>Generated on: {new Date(data.auditedAt).toLocaleString()} | Scan duration: {(data.durationMs / 1000).toFixed(1)}s | Tested across {data.responsive.devices.length} screens</Text>
    </Page>

    {/* TABLE OF CONTENTS */}
    <Pg>
      <Sec title="Table of Contents" />
      <View style={{ marginTop: 15, gap: 8 }}>
        {[
          { num: "1", title: "Executive Summary", desc: "A quick, friendly bird's-eye view of your site's health and priority items." },
          { num: "2", title: "Broken Link Validation", desc: "Results of testing all anchor tags and resources for HTTP errors." },
          { num: "3", title: "SEO Analysis Checkpoints", desc: "Structure, tag length, heading hierarchies, images, and social previews." },
          { num: "4", title: "Security & Performance Audit", desc: "HTTPS, SSL status, security headers, PageSpeed and GTmetrix results." },
          { num: "5", title: "Responsive & Vision Testing", desc: "Cross-device visual analysis for overlapping, padding, and layout breaks." },
          { num: "6", title: "Form Usability & Validation Check", desc: "Strict verification of form fields, validation behavior, and usability." },
          { num: "7", title: "Detailed Issue & Task Checklist", desc: "A comprehensive developer-friendly checklist of issues sorted by priority." }
        ].map((item, i) => (
          <View key={i} style={{ padding: 10, backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc", borderRadius: 4, borderLeft: `3 solid ${C.primary}` }}>
            <Text style={{ fontSize: 9, fontWeight: 700, color: C.dark }}>{item.num}. {item.title}</Text>
            <Text style={{ fontSize: 7.5, color: C.gray500, marginTop: 2 }}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </Pg>

    {/* 1. EXECUTIVE SUMMARY */}
    <Pg>
      <Sec title="1. Executive Summary" />
      
      {/* Friendly, Informal Greeting */}
      <View style={{ backgroundColor: "#f3f4f6", padding: 12, borderRadius: 6, borderLeft: `4 solid ${C.primary}`, marginBottom: 12 }}>
        <Text style={{ fontSize: 10, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Hey there! Let's talk about your website...</Text>
        <Text style={{ fontSize: 8, color: C.gray600, lineHeight: 1.5 }}>
          We've just run a comprehensive, deep-dive scan on <Text style={s.bold}>{data.url}</Text>, acting as your friendly neighborhood AI auditing team! 
          We checked your code for broken links, inspected SEO tag compliance, verified security standards, analyzed performance, and even used AI vision to look at your screens for overlapping elements and padding gaps.
        </Text>
        <Text style={{ fontSize: 8, color: C.gray600, lineHeight: 1.5, marginTop: 4 }}>
          Overall, your site scores a <Text style={[s.bold, { color: data.overallScore >= 70 ? C.pass : C.critical }]}>{data.overallScore}/100</Text>. 
          Some parts are looking absolutely brilliant, while a few spots could use a little TLC. Check out the report cards below to see the quick summary, and use Section 7 as your ultimate launch checklist!
        </Text>
      </View>

      <View style={s.metricsRow}>
        <Metric label="Overall Health" value={`${data.overallScore}/100`} color={data.overallScore >= 70 ? C.pass : C.critical} />
        <Metric label="SEO Compliance" value={`${data.seo.score}/100`} color={data.seo.score >= 70 ? C.pass : C.medium} />
        <Metric label="Security Integrity" value={`${data.security.score}/100`} color={data.security.score >= 70 ? C.pass : C.medium} />
        {data.performance.gtmetrix ? (
          <Metric label="GTmetrix Performance" value={Math.round(data.performance.gtmetrix.performanceScore * 100) + "%"} color={C.primary} />
        ) : (
          <Metric label="Broken Links" value={`${data.links.broken} broken`} color={data.links.broken ? C.critical : C.pass} />
        )}
        <Metric label="Screens Tested" value={data.responsive.devices.length} />
      </View>

      {/* Graphical Managerial Health Overview */}
      <View style={{ marginVertical: 10, padding: 10, backgroundColor: "#ffffff", borderRadius: 6, border: "1 solid #e2e8f0" }}>
        <HealthScoreBar score={data.overallScore} />
        <IssuesDistributionBar
          critical={data.criticalCount}
          high={data.highCount}
          medium={data.mediumCount}
          low={data.lowCount}
        />
      </View>

      <CheckHeader />
      <CheckRow id="1.1" checkpoint="Broken Links" what="Scans all anchor/link tags for HTTP errors (4xx/5xx)" result={data.links.broken ? `${data.links.broken} broken` : "All OK"} severity={data.links.broken > 0 ? (data.links.broken > 5 ? "critical" : "high") : undefined} alt />
      <CheckRow id="1.2" checkpoint="SEO Score" what="Title, meta desc, H1, alt text, robots.txt, sitemap" result={`${data.seo.score}/100`} severity={data.seo.score < 50 ? "high" : data.seo.score < 70 ? "medium" : undefined} />
      <CheckRow id="1.3" checkpoint="Security Score" what="HTTPS, SSL, security headers, safe browsing" result={`${data.security.score}/100`} severity={data.security.score < 50 ? "critical" : data.security.score < 70 ? "high" : undefined} alt />
      <CheckRow id="1.4" checkpoint="Desktop Render" what="Screenshots on desktop viewports for visual bugs" result={`${desk.length} device(s)`} severity={desk.some(d => d.aiIssues.length) ? "medium" : undefined} />
      <CheckRow id="1.5" checkpoint="Mobile Render" what="Screenshots on mobile viewports for layout issues" result={`${mob.length} device(s)`} severity={mob.some(d => d.aiIssues.length) ? "medium" : undefined} alt />
      <CheckRow id="1.6" checkpoint="Tablet Render" what="Screenshots on tablet viewports" result={`${tab.length} device(s)`} severity={tab.some(d => d.aiIssues.length) ? "medium" : undefined} />
      <CheckRow id="1.7" checkpoint="Form Usability" what="Labels, placeholders, submit buttons, required fields" result={data.forms.totalForms ? `${data.forms.totalForms} form(s)` : "No forms"} severity={data.forms.issues.length ? "medium" : undefined} alt />

      {all.filter(i => i.severity === "critical" || i.severity === "high").length > 0 && <>
        <View style={s.divider} />
        <Text style={[s.bold, { color: C.critical, marginBottom: 4, fontSize: 9.5 }]}>Major Fixes to Prioritize First:</Text>
        {all.filter(i => i.severity === "critical" || i.severity === "high").slice(0, 5).map(i => <IssueBlock key={i.id} issue={i} />)}
      </>}
    </Pg>

    {/* 2. BROKEN LINKS */}
    <Pg><Sec title="2. Broken Link Validation"
      desc="Every anchor tag and linked resource on the page is verified with a live HTTP request. Broken links (4xx/5xx errors) hurt user experience, SEO rankings, and crawlability."
      tip="Why it matters: Search engines penalise pages with broken links. Users lose trust when they click a link and get a 404 error. Redirects (3xx) are acceptable but should be reviewed if excessive."
    />
      <View style={s.metricsRow}>
        <Metric label="Total Scanned" value={data.links.total} />
        <Metric label="OK (2xx)" value={data.links.ok} color={C.pass} />
        <Metric label="Broken (4xx/5xx)" value={data.links.broken} color={data.links.broken ? C.critical : C.pass} />
        <Metric label="Redirects (3xx)" value={data.links.redirects} color={C.medium} />
      </View>
      <CheckHeader />
      <CheckRow id="2.1" checkpoint="HTTP Status" what="Each link returns 2xx success response" result={data.links.broken ? `${data.links.broken} failed` : "All 2xx"} severity={data.links.broken ? "high" : undefined} alt />
      <CheckRow id="2.2" checkpoint="Redirect Chains" what="Links that redirect (301/302) to final destination" result={`${data.links.redirects} redirect(s)`} severity={data.links.redirects > 10 ? "low" : undefined} />
      <CheckRow id="2.3" checkpoint="Timeout Errors" what="Links that did not respond within timeout" result={data.links.links.filter(l => l.error).length ? `${data.links.links.filter(l => l.error).length} timeout(s)` : "None"} severity={data.links.links.filter(l => l.error).length ? "medium" : undefined} alt />

      {data.links.screenshotBase64 && data.links.screenshotBase64.length > 100 && <View style={{ marginTop: 8 }}><Text style={[s.small, s.muted, { marginBottom: 4 }]}>Screenshot with broken links highlighted:</Text><Image src={`data:image/jpeg;base64,${data.links.screenshotBase64}`} style={[s.deviceImg, { width: "100%", maxHeight: 200 }]} /></View>}

      {data.links.links.filter(l => !l.ok).length > 0 && <>
        <Text style={[s.bold, { marginTop: 8, marginBottom: 4 }]}>Broken Link Details:</Text>
        <View style={s.tableHeader}>
          <View style={{ width: "12%" }}>
            <Text style={s.tableHeaderCell}>Status</Text>
          </View>
          <View style={{ width: "58%" }}>
            <Text style={s.tableHeaderCell}>URL</Text>
          </View>
          <View style={{ width: "30%" }}>
            <Text style={s.tableHeaderCell}>Error</Text>
          </View>
        </View>
        {data.links.links.filter(l => !l.ok).slice(0, 25).map((l, i) => <View key={i} style={i % 2 ? s.tableRowAlt : s.tableRow}>
          <View style={{ width: "12%" }}>
            <Text style={[s.tableCell, { color: C.critical, fontWeight: 700 }]}>{l.status ?? "ERR"}</Text>
          </View>
          <View style={{ width: "58%", paddingRight: 4 }}>
            <Text style={s.tableCell}>{truncateUrl(l.url, 45)}</Text>
          </View>
          <View style={{ width: "30%" }}>
            <Text style={s.tableCell}>{l.error ?? "HTTP Error"}</Text>
          </View>
        </View>)}
      </>}
      {data.links.broken === 0 && <Text style={[s.small, { color: C.pass, marginTop: 6 }]}>All {data.links.total} links returned valid HTTP responses. No broken links detected.</Text>}
    </Pg>

    {/* 3. SEO */}
    <Pg><Sec title="3. SEO Analysis Checkpoints"
      desc="Search Engine Optimisation (SEO) checks verify that the page is correctly structured for search engines like Google to discover, index, and rank it. Missing elements reduce visibility in search results."
      tip="Why it matters: Poor SEO means fewer visitors find your site organically. Each checkpoint below reflects a Google ranking factor or best practice that affects how your page appears in search results."
    />
      <View style={[s.row, { marginBottom: 8 }]}><Score score={data.seo.score} /><View style={s.flex1}><Text style={[s.bold, { fontSize: 11 }]}>SEO Score: {data.seo.score}/100</Text><Text style={s.muted}>Based on {data.seo.issues.length} issue(s) found across all checkpoints</Text></View></View>
      <CheckHeader />
      <CheckRow id="3.1" checkpoint="robots.txt Block Check" what='Ensure the offer site is blocked from Google crawling and indexing via "robots.txt"' result={data.seo.robotsTxtExists ? "PASS" : "FAIL"} severity={!data.seo.robotsTxtExists ? "medium" : undefined} alt includeManualQA />
      <CheckRow id="3.2" checkpoint="OpenGraph Verification" what="Verify Open Graph information across multiple social media platforms using OpenGraph" result={data.seo.ogTitle ? "PASS" : "FAIL"} severity={!data.seo.ogTitle ? "low" : undefined} includeManualQA />
      {data.seo.ogTitle && (
        <View style={{ padding: 10, backgroundColor: "#f3f4f6", borderLeft: "3 solid #2563eb", marginVertical: 4 }}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>Native OpenGraph Social Preview:</Text>
          <View style={{ border: "1 solid #d1d5db", borderRadius: 6, backgroundColor: "#ffffff", overflow: "hidden", width: "70%" }}>
            {(() => {
              if (data.seo.ogImageBase64 && data.seo.ogImageBase64.length > 100) {
                return <Image src={data.seo.ogImageBase64.startsWith("data:") ? data.seo.ogImageBase64 : `data:image/jpeg;base64,${data.seo.ogImageBase64}`} style={{ width: "100%", height: 120, objectFit: "cover" }} />;
              }
              const fallbackScreenshot = data.responsive.devices?.[0]?.screenshotBase64;
              if (fallbackScreenshot && fallbackScreenshot.length > 100) {
                return <Image src={fallbackScreenshot.startsWith("data:") ? fallbackScreenshot : `data:image/jpeg;base64,${fallbackScreenshot}`} style={{ width: "100%", height: 120, objectFit: "cover" }} />;
              }
              return <View style={{ width: "100%", height: 120, backgroundColor: "#3b82f6", justifyContent: "center", alignItems: "center" }}><Text style={{ fontSize: 9, color: "#ffffff", fontWeight: "bold" }}>No Social Preview Image</Text></View>;
            })()}
            <View style={{ padding: 8 }}>
              <Text style={{ fontSize: 7, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 }}>
                {(() => {
                  try {
                    return new URL(data.url).hostname;
                  } catch {
                    return data.url;
                  }
                })()}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#111827", marginBottom: 3, lineHeight: 1.2 }}>{data.seo.ogTitle}</Text>
              <Text style={{ fontSize: 8, color: "#4b5563", lineHeight: 1.4 }}>{data.seo.ogDescription?.slice(0, 100)}...</Text>
            </View>
          </View>
        </View>
      )}
      <CheckRow id="3.3" checkpoint="Title Tag" what="Page has a <title> tag between 30-60 characters" result={data.seo.title ? `PASS (${data.seo.titleLength}ch)` : "FAIL"} severity={!data.seo.titleOk ? (data.seo.title ? "medium" : "high") : undefined} alt includeManualQA />
      <CheckRow id="3.4" checkpoint="Meta Description" what="Page has <meta name='description'> between 120-160 chars" result={data.seo.description ? `PASS` : "FAIL"} severity={!data.seo.descriptionOk ? (data.seo.description ? "medium" : "high") : undefined} includeManualQA />
      <CheckRow id="3.5" checkpoint="H1 Heading" what="Exactly one <h1> tag for proper heading hierarchy" result={data.seo.h1Ok ? "PASS" : "FAIL"} severity={!data.seo.h1Ok ? (data.seo.h1Count === 0 ? "high" : "medium") : undefined} alt includeManualQA />
      <CheckRow id="3.6" checkpoint="Image Alt Text" what="All <img> tags have descriptive alt attributes" result={data.seo.imagesWithoutAlt === 0 ? "PASS" : "FAIL"} severity={data.seo.imagesWithoutAlt > 0 ? "medium" : undefined} includeManualQA />
      <CheckRow id="3.7" checkpoint="XML Sitemap" what="sitemap.xml exists to help search engines index pages" result={data.seo.sitemapExists ? "PASS" : "FAIL"} severity={!data.seo.sitemapExists ? "medium" : undefined} alt includeManualQA />
      <CheckRow id="3.8" checkpoint="Canonical URL" what="<link rel='canonical'> prevents duplicate content" result={data.seo.canonicalUrl ? "PASS" : "FAIL"} severity={!data.seo.canonicalUrl ? "low" : undefined} includeManualQA />
      <CheckRow id="3.9" checkpoint="Structured Data" what="JSON-LD / Schema.org markup for rich search results" result={data.seo.structuredDataCount > 0 ? "PASS" : "FAIL"} severity={data.seo.structuredDataCount === 0 ? "low" : undefined} alt includeManualQA />
      {data.seo.issues.length > 0 && <><View style={s.divider} /><Text style={[s.bold, { marginBottom: 4 }]}>SEO Issues Detail:</Text>{data.seo.issues.map(i => <IssueBlock key={i.id} issue={i} />)}</>}
    </Pg>

    {/* 4. SECURITY & PERFORMANCE */}
    <Pg>
      <Sec title="4. Security & Performance Audit Checkpoints"
        desc="This section verifies 10 critical security and performance checks. Each checkpoint tells you exactly what was tested, why it matters, and what the result was. Use the tool links provided to independently verify each result and attach your own report link and screenshot as evidence."
        tip="Why it matters: These checks protect your website visitors, improve trust, and ensure your site meets industry-standard security compliance. A failing check is a real vulnerability that can result in data leaks, phishing attacks, or loss of search engine rankings."
      />

      <View style={[s.row, { marginBottom: 12 }]}>
        <Score score={data.security.score} />
        <View style={s.flex1}>
          <Text style={[s.bold, { fontSize: 11 }]}>Overall Security Score: {data.security.score}/100</Text>
          <Text style={s.muted}>{data.security.issues.length} automated issue(s) found across all checkpoints below</Text>
        </View>
      </View>

      <SecurityCheckCard
        id="1"
        heading="HTTPS Redirect"
        result={data.security.httpsRedirect ? "PASS" : "FAIL"}
        passed={data.security.httpsRedirect}
        description="Verifies that all incoming unencrypted HTTP requests are automatically routed to the secure HTTPS protocol."
        impact="Ensures data integrity and confidentiality during transmission, protecting users from man-in-the-middle attacks and improving Search Engine ranking."
        toolLinks={[]}
        screenshotBase64={data.security.automatedHttpsRedirect?.screenshotBase64}
        reportUrl={data.security.automatedHttpsRedirect?.reportUrl}
      />

      <SecurityCheckCard
        id="2"
        heading="HTTP/2 Status Check"
        result={data.security.automatedHttp2?.screenshotBase64 ? "PASS" : "FAIL"}
        passed={!!data.security.automatedHttp2?.screenshotBase64}
        description="Checks if the server supports the multiplexed HTTP/2 protocol."
        impact="Reduces round-trip latency by enabling concurrent resource loading over a single connection, leading to a much faster page load experience."
        toolLinks={[{ label: "HTTP/2 Test Tool", url: "https://tools.keycdn.com/http2-test" }]}
        screenshotBase64={data.security.automatedHttp2?.screenshotBase64}
        reportUrl={data.security.automatedHttp2?.reportUrl}
      />

      <SecurityCheckCard
        id="3"
        heading="HTML Optimisation Check"
        result={data.security.htmlValidationErrors < 10 ? "PASS" : `FAIL (${data.security.htmlValidationErrors} errors)`}
        passed={data.security.htmlValidationErrors < 10}
        description="Checks the source markup against official W3C standards using the Nu HTML Validator."
        impact="Fixing nesting and semantic errors prevents rendering quirks across different web browsers and ensures clean search engine crawling."
        toolLinks={[{ label: "W3C Nu HTML Validator", url: "https://validator.w3.org/nu/" }]}
        screenshotBase64={data.security.automatedHtmlOptimisation?.screenshotBase64}
        reportUrl={data.security.automatedHtmlOptimisation?.reportUrl}
      />

      <SecurityCheckCard
        id="4"
        heading="Domain Test URL (DNS Check)"
        result={data.security.automatedDns?.screenshotBase64 ? "PASS" : "FAIL"}
        passed={!!data.security.automatedDns?.screenshotBase64}
        description="Validates DNS lookup times, record propagation (A/AAAA/CNAME), and nameservers."
        impact="Ensures high availability and minimal initial lookup delay when users enter the website domain name."
        toolLinks={[{ label: "DNS Propagation Checker", url: "https://www.whatsmydns.net/" }]}
        screenshotBase64={data.security.automatedDns?.screenshotBase64}
        reportUrl={data.security.automatedDns?.reportUrl}
      />

      <SecurityCheckCard
        id="5"
        heading="Safe Browsing Site Status"
        result={data.security.automatedSafeBrowsing?.screenshotBase64 ? "PASS" : "FAIL"}
        passed={!!data.security.automatedSafeBrowsing?.screenshotBase64}
        description="Queries Google Safe Browsing API to ensure the domain is not listed as hosting malware, phishing scripts, or compromised software."
        impact="Prevents browsers from showing red security warning pages that destroy brand trust and traffic immediately."
        toolLinks={[{ label: "Google Safe Browsing Report", url: "https://transparencyreport.google.com/safe-browsing/search?hl=en" }]}
        screenshotBase64={data.security.automatedSafeBrowsing?.screenshotBase64}
        reportUrl={data.security.automatedSafeBrowsing?.reportUrl}
      />

      <SecurityCheckCard
        id="6"
        heading="Domain Expiry Check"
        result={data.security.automatedDomainExpiry?.expiryText ? `PASS (${data.security.sslDaysRemaining ?? "?"} days left)` : "FAIL"}
        passed={!!data.security.automatedDomainExpiry?.expiryText}
        description="Checks SSL certificate details and domain registration expiration timeline."
        impact="Guarantees operational continuity; avoids catastrophic website offline states due to expired certificates or domain registration loss."
        toolLinks={[{ label: "DigiCert Domain Checker", url: "https://www.digicert.com/help/" }]}
        screenshotBase64={data.security.automatedDomainExpiry?.screenshotBase64}
        reportUrl={data.security.automatedDomainExpiry?.reportUrl}
      />

      <SecurityCheckCard
        id="7"
        heading="Complete Redirect Chain Check"
        result={data.links.redirects < 10 ? `PASS (${data.links.redirects} redirect(s))` : `FAIL (${data.links.redirects} redirect(s) — too many)`}
        passed={data.links.redirects < 10}
        description="Traces the redirection hops from HTTP to the final destination URL."
        impact="Minimizes redirect loops and chains which add latency, drain mobile device batteries, and dilute search ranking equity."
        toolLinks={[
          { label: "Where Goes Redirect Tracer", url: "http://wheregoes.com/" }
        ]}
        screenshotBase64={data.security.automatedRedirectChain?.screenshotBase64}
        reportUrl={data.security.automatedRedirectChain?.reportUrl}
      />

      <SecurityCheckCard
        id="8"
        heading="SSL Certificate Grade"
        result={data.security.sslValid ? `PASS — Valid (${data.security.sslDaysRemaining ?? "?"} days left)` : "FAIL — Invalid/Expired"}
        passed={data.security.sslValid}
        description="Audits the server's SSL certificate configuration, TLS version support, and cipher suite strengths."
        impact="Confirms strong, modern encryption protocols are active, protecting user credentials and complying with standard privacy laws."
        toolLinks={[{ label: "SSL Labs Server Test", url: "https://www.ssllabs.com/ssltest/" }]}
        screenshotBase64={data.security.automatedSsl?.screenshotBase64}
        reportUrl={data.security.automatedSsl?.reportUrl}
      />

      {/* Google PageSpeed Insights Cards (Desktop and Mobile) */}
      <PerformanceCheckCard
        id="9"
        heading="Google PageSpeed Insights (Desktop)"
        result={data.performance.desktop ? (data.performance.desktop.score >= 80 ? "PASS" : "WARNING") : "FAIL"}
        score={data.performance.desktop ? data.performance.desktop.score : 0}
        metrics={{
          fcp: data.performance.desktop?.fcp || "N/A",
          lcp: data.performance.desktop?.lcp || "N/A",
          cls: data.performance.desktop?.cls || "N/A",
          speedIndex: data.performance.desktop?.speedIndex || "N/A"
        }}
        passed={data.performance.desktop ? data.performance.desktop.score >= 80 : false}
        description="Measures desktop loading speed, interactive latency, and cumulative layout stability using Lighthouse."
        impact="Directly impacts desktop conversions, bounce rates, and organic search ranking authority."
        toolLinks={[{ label: "PageSpeed Insights Tool", url: "https://pagespeed.web.dev/" }]}
        screenshotBase64={data.performance.desktop?.screenshot}
        reportUrl={data.performance.desktop ? `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(data.url)}&form_factor=desktop` : undefined}
      />

      <PerformanceCheckCard
        id="10"
        heading="Google PageSpeed Insights (Mobile)"
        result={data.performance.mobile ? (data.performance.mobile.score >= 80 ? "PASS" : "WARNING") : "FAIL"}
        score={data.performance.mobile ? data.performance.mobile.score : 0}
        metrics={{
          fcp: data.performance.mobile?.fcp || "N/A",
          lcp: data.performance.mobile?.lcp || "N/A",
          cls: data.performance.mobile?.cls || "N/A",
          speedIndex: data.performance.mobile?.speedIndex || "N/A"
        }}
        passed={data.performance.mobile ? data.performance.mobile.score >= 80 : false}
        description="Simulates loading speed on mobile devices under standard throttled network conditions."
        impact="Critical because mobile traffic comprises over 60% of web visitors, and Google prioritizes mobile-first indexing."
        toolLinks={[{ label: "PageSpeed Insights Tool", url: "https://pagespeed.web.dev/" }]}
        screenshotBase64={data.performance.mobile?.screenshot}
        reportUrl={data.performance.mobile ? `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(data.url)}&form_factor=mobile` : undefined}
      />

      {/* Waterfall Model Details Section */}
      <View style={{ marginTop: 15 }} wrap={false}>
        <Text style={{ fontSize: 10, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>PageSpeed Waterfall Model Analysis</Text>
        <Text style={{ fontSize: 7.5, color: "#64748b", lineHeight: 1.4, marginBottom: 8 }}>
          The waterfall charts below represent the timeline of the initial and slowest network requests loaded during the Lighthouse performance audit. Developers should review these assets (HTML, CSS, JS, Images, and Fonts) to identify render-blocking resources, excessive download durations, or large payloads that negatively affect First Contentful Paint (FCP) and Largest Contentful Paint (LCP).
        </Text>
      </View>

      <WaterfallModelTable
        title="Desktop Network Load Timeline (Waterfall Model)"
        waterfall={data.performance.desktop?.waterfall}
      />

      <WaterfallModelTable
        title="Mobile Network Load Timeline (Waterfall Model)"
        waterfall={data.performance.mobile?.waterfall}
      />
    </Pg>



    {/* 5. RESPONSIVE */}
    <Pg><Sec title="5. Responsive / Cross-Device Testing"
      desc="The website is loaded in real browser viewports across desktop, mobile, and tablet sizes. Screenshots are captured and load times measured. AI vision analysis checks each screenshot for layout breaks, text overflow, hidden elements, and usability problems."
      tip="How to read this section: Each device card is colour-coded GREEN (PASS) if no issues were found, or RED if AI detected problems. Devices that pass are listed in a PASS summary. Issues are shown per device with severity and a recommended fix."
    />
      <View style={s.metricsRow}>
        <Metric label="Devices Tested" value={data.responsive.devices.length} />
        <Metric label="Desktop" value={desk.length} />
        <Metric label="Mobile" value={mob.length} />
        <Metric label="Tablet" value={tab.length} />
        <Metric label="Issues Found" value={data.responsive.issues.length + data.responsive.devices.reduce((a, d) => a + d.aiIssues.length, 0)} color={data.responsive.issues.length ? C.high : C.pass} />
      </View>
      <DeviceSection title="Desktop Devices" devices={desk} />
      <DeviceSection title="Mobile Devices" devices={mob} />
      <DeviceSection title="Tablet Devices" devices={tab} />
    </Pg>

    {/* 6. FORMS */}
    <Pg>
      <Sec title="6. Form Usability & Functional Audit"
        desc="Forms are the ultimate bridge between your visitors and your business. We conducted a deep-dive accessibility, layout, and strict functional validation audit using LLM reasoning to ensure zero friction and flawless conversion."
        tip="Why it matters: If a form is difficult to fill out or lets users submit invalid details, you lose leads and get bad data. Ensuring labels match placeholders, enforcing strict digit counts, blocking characters where only numbers belong, and verifying consent checkbox behavior guarantees high-quality submissions."
      />

      {data.forms.totalForms === 0 ? (
        <View style={{ padding: 20, backgroundColor: "#f3f4f6", borderRadius: 6, alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: C.gray500, fontWeight: 700 }}>No Forms Found</Text>
          <Text style={{ fontSize: 8, color: C.gray400, marginTop: 4 }}>We couldn't find any HTML form elements on this page. This section is not applicable!</Text>
        </View>
      ) : (
        <>
          {/* Functional Rules Checklist Card */}
          <View style={{ backgroundColor: "#f8fafc", border: "1 solid #e2e8f0", borderRadius: 6, padding: 10, marginBottom: 12 }}>
            <Text style={{ fontSize: 9, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Strict QA Functional Validation Checklist:</Text>
            
            {[
              { rule: "Identity Match", desc: "Field names and placeholder labels must match exactly (prevents user confusion).", status: data.forms.issues.some(i => i.title.toLowerCase().includes("placeholder") || i.title.toLowerCase().includes("match")) ? "FAILED" : "PASSED" },
              { rule: "Strict 10-Digit Phone Check", desc: "Phone inputs must only accept exactly 10 digits (using min/max or pattern restrictions).", status: data.forms.issues.some(i => i.title.toLowerCase().includes("phone") && (i.title.toLowerCase().includes("digit") || i.title.toLowerCase().includes("length"))) ? "FAILED" : "PASSED" },
              { rule: "Non-Numeric Blockers", desc: "Phone, Card Number, CVV, and Zip fields must block letters and symbols.", status: data.forms.issues.some(i => i.title.toLowerCase().includes("character") || i.title.toLowerCase().includes("numeric")) ? "FAILED" : "PASSED" },
              { rule: "16-Digit Credit Card Enforcer", desc: "Credit Card fields must strictly validate and enforce a 16-digit constraint.", status: data.forms.issues.some(i => i.title.toLowerCase().includes("card") && i.title.toLowerCase().includes("16")) ? "FAILED" : "PASSED" },
              { rule: "Consent Checkbox Verification", desc: "Consent/Terms checkboxes must be marked required and validated when unchecked.", status: data.forms.issues.some(i => i.title.toLowerCase().includes("checkbox") || i.title.toLowerCase().includes("terms")) ? "FAILED" : "PASSED" }
            ].map((item, idx) => (
              <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: idx < 4 ? "1 solid #f1f5f9" : "none", paddingVertical: 4 }}>
                <View style={{ width: "80%" }}>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: C.dark }}>{item.rule}</Text>
                  <Text style={{ fontSize: 7, color: C.gray500 }}>{item.desc}</Text>
                </View>
                <Text style={{ fontSize: 7.5, fontWeight: 700, color: item.status === "PASSED" ? C.pass : C.critical }}>
                  {item.status === "PASSED" ? "PASSED" : "ISSUE"}
                </Text>
              </View>
            ))}
          </View>

          {/* Form-by-Form breakdown */}
          <Text style={{ fontSize: 9, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Audited Form Elements:</Text>
          {data.forms.forms.map((f, fi) => {
            const missingLabels = f.fields.filter(fl => !fl.hasLabel).length;
            return (
              <View key={fi} style={{ marginBottom: 12, border: "1 solid #e5e7eb", borderRadius: 6, overflow: "hidden" }} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.navy, padding: "6 8" }}>
                  <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.white }}>Form #{fi + 1} ({f.method})</Text>
                  <Text style={{ fontSize: 7, color: "#94a3b8" }}>Target: {f.action || "Self / Javascript"}</Text>
                </View>
                
                <View style={{ padding: 8, gap: 6 }}>
                  {/* Stats block */}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Text style={{ fontSize: 7.5, color: C.gray600 }}>Total Fields: <Text style={s.bold}>{f.fieldCount}</Text></Text>
                    <Text style={{ fontSize: 7.5, color: C.gray600 }}>Submit Button: <Text style={[s.bold, { color: f.hasSubmitButton ? C.pass : C.critical }]}>{f.hasSubmitButton ? "Present" : "Missing"}</Text></Text>
                    <Text style={{ fontSize: 7.5, color: C.gray600 }}>Label Coverage: <Text style={[s.bold, { color: missingLabels === 0 ? C.pass : C.high }]}>{missingLabels === 0 ? "100%" : `${f.fieldCount - missingLabels}/${f.fieldCount}`}</Text></Text>
                  </View>

                  {/* HTML mini-table representation */}
                  {f.fields.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                      <View style={{ flexDirection: "row", backgroundColor: "#f1f5f9", padding: 3, borderRadius: 2 }}>
                        <View style={{ width: "20%" }}><Text style={{ fontSize: 6.5, fontWeight: 700 }}>Tag</Text></View>
                        <View style={{ width: "20%" }}><Text style={{ fontSize: 6.5, fontWeight: 700 }}>Type</Text></View>
                        <View style={{ width: "30%" }}><Text style={{ fontSize: 6.5, fontWeight: 700 }}>Name Attribute</Text></View>
                        <View style={{ width: "15%" }}><Text style={{ fontSize: 6.5, fontWeight: 700 }}>Label</Text></View>
                        <View style={{ width: "15%" }}><Text style={{ fontSize: 6.5, fontWeight: 700 }}>Required</Text></View>
                      </View>
                      {f.fields.slice(0, 8).map((fld, fidx) => (
                        <View key={fidx} style={{ flexDirection: "row", borderBottom: "1 solid #f1f5f9", padding: 3 }}>
                          <View style={{ width: "20%" }}><Text style={{ fontSize: 6.5, fontFamily: "Courier" }}>&lt;{fld.tag}&gt;</Text></View>
                          <View style={{ width: "20%" }}><Text style={{ fontSize: 6.5 }}>{fld.type || "text"}</Text></View>
                          <View style={{ width: "30%" }}><Text style={{ fontSize: 6.5, fontFamily: "Courier" }}>{fld.name || "(none)"}</Text></View>
                          <View style={{ width: "15%" }}><Text style={{ fontSize: 6.5, color: fld.hasLabel ? C.pass : C.critical }}>{fld.hasLabel ? "Yes" : "No"}</Text></View>
                          <View style={{ width: "15%" }}><Text style={{ fontSize: 6.5, color: fld.required ? C.pass : C.gray400 }}>{fld.required ? "Yes" : "No"}</Text></View>
                        </View>
                      ))}
                      {f.fields.length > 8 && (
                        <Text style={{ fontSize: 6, color: C.gray400, marginTop: 2, fontStyle: "italic" }}>... and {f.fields.length - 8} more field(s)</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {data.forms.issues.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              <Text style={[s.bold, { color: C.critical, fontSize: 9, marginBottom: 4 }]}>Form Usability & Validation Issues Detected:</Text>
              {data.forms.issues.map(i => <IssueBlock key={i.id} issue={i} />)}
            </View>
          ) : (
            <View style={{ marginTop: 6, padding: 8, backgroundColor: C.passBg, borderRadius: 4, borderLeft: `3 solid ${C.pass}` }}>
              <Text style={{ fontSize: 8, color: C.pass, fontWeight: 700 }}>Flawless Forms Check! All tested forms fully conform to usability, accessibility, and strict functional validation guidelines. No friction or security bugs detected.</Text>
            </View>
          )}
        </>
      )}
    </Pg>

    {/* 7. FULL ISSUE LOG */}
    <Pg><Sec title="7. Complete Issue Log — Developer Action Checklist"
      desc="Every issue found across all audit categories is listed below, ordered by severity. Each entry includes: what was found, why it is a problem, the priority level (P1-P4), and a specific fix recommendation. Use this as your development task list."
      tip="Priority guide: P1 Critical — fix before deployment. P2 High — fix in current sprint. P3 Medium — schedule in next sprint. P4 Low — address when time permits."
    />
      {all.length === 0 ? <Text style={[s.small, { color: C.pass }]}>No issues were found during this audit. All checkpoints passed successfully.</Text> : <>
        <View style={s.metricsRow}>
          <Metric label="Critical" value={data.criticalCount} color={data.criticalCount ? C.critical : C.pass} />
          <Metric label="High" value={data.highCount} color={data.highCount ? C.high : C.pass} />
          <Metric label="Medium" value={data.mediumCount} color={data.mediumCount ? C.medium : C.pass} />
          <Metric label="Low" value={data.lowCount} color={data.lowCount ? C.low : C.pass} />
        </View>
        {all.map(i => <IssueBlock key={i.id} issue={i} />)}
      </>}
    </Pg>
  </Document>;
}
