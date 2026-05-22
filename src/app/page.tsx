"use client";

import { useState, useRef, useCallback } from "react";
import type { AuditResult, ProgressEvent } from "@/lib/types";
import { AuditProgress } from "./components/AuditProgress";
import { DeviceGrid } from "./components/DeviceGrid";
import { IssueCard } from "./components/IssueCard";
import { MetricCard } from "./components/MetricCard";

type AppState = "idle" | "running" | "complete" | "error";
type TabId = "summary" | "links" | "desktop" | "mobile" | "tablet" | "seo" | "security" | "forms";

export default function Home() {
  const [url, setUrl] = useState("");
  const [appState, setAppState] = useState<AppState>("idle");
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<AuditResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const startAudit = useCallback(async () => {
    if (!url.trim()) return;
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    setAppState("running");
    setEvents([]);
    setProgress(0);
    setCurrentStep("init");
    setCurrentMessage("Starting audit...");
    setError("");
    setSessionId(null);
    setAuditData(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(
        `/api/audit?url=${encodeURIComponent(targetUrl)}`,
        { signal: abortRef.current.signal }
      );

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const dataLine = line.replace(/^data: /, "").trim();
          if (!dataLine) continue;
          try {
            const evt: ProgressEvent = JSON.parse(dataLine);
            setEvents((prev) => [...prev, evt]);
            setProgress(evt.progress);
            setCurrentStep(evt.step);
            setCurrentMessage(evt.message);

            if (evt.done) {
              if (evt.error) {
                setError(evt.error);
                setAppState("error");
              } else if (evt.sessionId) {
                setSessionId(evt.sessionId);
                // Load audit data from tmp via a simple fetch
                const dataRes = await fetch(`/api/data?sessionId=${evt.sessionId}`);
                if (dataRes.ok) {
                  const data: AuditResult = await dataRes.json();
                  setAuditData(data);
                }
                setAppState("complete");
              }
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
      setAppState("error");
    }
  }, [url]);

  const downloadPDF = () => {
    if (sessionId) window.open(`/api/report?sessionId=${sessionId}`, "_blank");
  };

  const reset = () => {
    abortRef.current?.abort();
    setAppState("idle");
    setEvents([]);
    setProgress(0);
    setAuditData(null);
    setSessionId(null);
    setError("");
  };

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "summary", label: "Summary", icon: "📊" },
    { id: "links", label: "Links", icon: "🔗" },
    { id: "desktop", label: "Desktop", icon: "🖥️" },
    { id: "mobile", label: "Mobile", icon: "📱" },
    { id: "tablet", label: "Tablet", icon: "📟" },
    { id: "seo", label: "SEO", icon: "🔍" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "forms", label: "Forms", icon: "📝" },
  ];

  return (
    <>
      <div className="hero-bg" />

      <main className="min-h-screen px-4 py-8 md:py-12 max-w-6xl mx-auto space-y-8">

        {/* ── Header ── */}
        <header className="text-center space-y-4 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 ring-1 ring-blue-500/30 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Enterprise QA & Security Auditor
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            QA-Auditor <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Web Diagnostics</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
            Professional automated auditing for modern web applications. Enter your website URL below to generate a comprehensive, executive-ready PDF report covering Functional Links, Responsive UI, Technical SEO, Security Compliance, and Usability.
          </p>
        </header>

        {/* ── URL Input & Instructions ── */}
        {(appState === "idle" || appState === "error") && (
          <section className="animate-fadeInUp space-y-8">
            <div className="glass p-6 md:p-8 space-y-6">
              {/* How it works instruction block for layman users */}
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-5 mb-2">
                <h3 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
                  <span className="text-xl">📋</span> How to Use This Tool
                </h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-white/70">
                  <div className="space-y-1">
                    <strong className="text-white/90">1. Enter Website URL</strong>
                    <p>Paste the full web address (e.g., https://example.com) you want to test in the box below.</p>
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white/90">2. Run the Audit</strong>
                    <p>Click "Run Audit". The system will automatically browse your site like a real user to check links, mobile display, security, and SEO.</p>
                  </div>
                  <div className="space-y-1">
                    <strong className="text-white/90">3. Get the Report</strong>
                    <p>Within minutes, you'll see a dashboard with your results. Download the PDF report to share with your developers or management.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">🌐</span>
                  <input
                    id="url-input"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startAudit()}
                    placeholder="https://example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <button
                  id="run-audit-btn"
                  onClick={startAudit}
                  disabled={!url.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap text-sm"
                >
                  Run Audit →
                </button>
              </div>

              <div className="flex items-center gap-3">

              </div>

              {appState === "error" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Quick examples */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <span className="text-xs text-white/30 pt-1.5">Try:</span>
                {["https://example.com", "https://github.com", "https://vercel.com"].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setUrl(ex)}
                    className="text-xs text-blue-400/70 hover:text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1 transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Progress Panel ── */}
        {appState === "running" && (
          <section className="glass p-6 md:p-8 space-y-4 animate-fadeInUp overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white break-all flex-1 min-w-0">Auditing {url}</h2>
              <button
                onClick={reset}
                className="text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-all self-end sm:self-auto shrink-0"
              >
                Cancel
              </button>
            </div>
            <AuditProgress
              events={events}
              progress={progress}
              currentStep={currentStep}
              currentMessage={currentMessage}
            />
          </section>
        )}

        {/* ── Results Dashboard ── */}
        {appState === "complete" && auditData && (
          <section className="space-y-6 animate-fadeInUp">
            {/* Score bar + actions */}
            <div className="glass p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-600" />

              <div className="flex gap-6 flex-wrap flex-1 pl-4">
                <div className="flex flex-col">
                  <span className="text-xs text-white/50 uppercase font-semibold tracking-wider mb-1">Health Score</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-extrabold ${auditData.overallScore >= 80 ? "text-emerald-400" : auditData.overallScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {auditData.overallScore}
                    </span>
                    <span className="text-xl text-white/30 font-light">/100</span>
                  </div>
                </div>

                <div className="h-12 w-px bg-white/10 hidden md:block self-center mx-2" />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                  <MetricCard label="Critical Issues" value={auditData.criticalCount} status={auditData.criticalCount > 0 ? "fail" : "pass"} icon="🔴" />
                  <MetricCard label="High Priority" value={auditData.highCount} status={auditData.highCount > 0 ? "warn" : "pass"} icon="🟠" />
                  <MetricCard label="SEO Health" value={`${auditData.seo.score}/100`} status={auditData.seo.score >= 70 ? "pass" : "warn"} icon="🔍" />
                  <MetricCard label="Security" value={`${auditData.security.score}/100`} status={auditData.security.score >= 70 ? "pass" : "warn"} icon="🔒" />
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-[220px]">
                <button
                  id="download-pdf-btn"
                  onClick={downloadPDF}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold px-6 py-3.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20 whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <span className="text-lg">📄</span> Executive Report
                </button>
                <button
                  onClick={reset}
                  className="text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-6 py-2.5 transition-all font-medium"
                >
                  ↩ Run New Audit
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border whitespace-nowrap transition-all ${activeTab === tab.id
                      ? "tab-active border-indigo-500/40"
                      : "text-white/40 border-white/10 hover:text-white/70 hover:border-white/20"
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="glass p-6 space-y-6 min-h-64">

              {/* Summary Tab */}
              {activeTab === "summary" && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="text-center space-y-4 py-8 bg-blue-900/10 rounded-2xl border border-blue-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    <h2 className="text-3xl font-extrabold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                      Diagnostic Test Summary
                    </h2>
                    <p className="text-white/60 text-lg max-w-2xl mx-auto break-all">
                      Analysis completed for <span className="text-blue-300 font-semibold break-all">{auditData.url}</span> in {(auditData.durationMs / 1000).toFixed(1)} seconds. We tested across {auditData.responsive.devices.length} environments.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white/90 flex items-center gap-2">
                      🚨 The Big Stuff to Fix
                    </h3>
                    <div className="grid gap-4">
                      {[...auditData.links.issues, ...auditData.responsive.issues, ...auditData.seo.issues, ...auditData.security.issues, ...auditData.forms.issues]
                        .filter((i) => i.severity === "critical" || i.severity === "high")
                        .slice(0, 10)
                        .map((issue) => <IssueCard key={issue.id} issue={issue} />)
                      }
                    </div>

                    {auditData.criticalCount === 0 && auditData.highCount === 0 && (
                      <div className="text-center py-12 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <p className="text-5xl mb-4 animate-bounce">🎉</p>
                        <p className="text-2xl font-bold text-emerald-400 mb-2">Looking Good!</p>
                        <p className="text-emerald-300/80">We didn&apos;t find any major dealbreakers. Give yourself a pat on the back.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Links Tab */}
              {activeTab === "links" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Link Validation</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Total Links" value={auditData.links.total} status="neutral" />
                    <MetricCard label="OK (2xx)" value={auditData.links.ok} status="pass" />
                    <MetricCard label="Broken" value={auditData.links.broken} status={auditData.links.broken > 0 ? "fail" : "pass"} />
                    <MetricCard label="Redirects" value={auditData.links.redirects} status="neutral" />
                  </div>
                  {auditData.links.screenshotBase64 && (
                    <div className="rounded-xl overflow-hidden ring-1 ring-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`data:image/jpeg;base64,${auditData.links.screenshotBase64}`} alt="Page with broken links highlighted" className="w-full" />
                      <p className="text-xs text-white/40 text-center p-2">Broken links highlighted in red</p>
                    </div>
                  )}
                  {auditData.links.links.filter((l) => !l.ok).slice(0, 30).map((link, i) => (
                    <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg min-w-[3rem] text-center">{link.status ?? "ERR"}</span>
                      <span className="text-sm text-white/70 font-mono break-all flex-1">{link.url}</span>
                      {link.error && <span className="text-xs text-red-400">{link.error}</span>}
                    </div>
                  ))}
                  {auditData.links.broken === 0 && (
                    <p className="text-emerald-400 text-center py-6">✅ All links are working correctly.</p>
                  )}
                </div>
              )}

              {/* Desktop Tab */}
              {activeTab === "desktop" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Desktop Screenshots</h2>
                  <DeviceGrid devices={auditData.responsive.devices} category="desktop" />
                </div>
              )}

              {/* Mobile Tab */}
              {activeTab === "mobile" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Mobile Screenshots</h2>
                  <DeviceGrid devices={auditData.responsive.devices} category="mobile" />
                </div>
              )}

              {/* Tablet Tab */}
              {activeTab === "tablet" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Tablet Screenshots</h2>
                  <DeviceGrid devices={auditData.responsive.devices} category="tablet" />
                </div>
              )}

              {/* SEO Tab */}
              {activeTab === "seo" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">SEO Analysis</h2>
                    <span className={`text-2xl font-bold ${auditData.seo.score >= 70 ? "text-emerald-400" : auditData.seo.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>{auditData.seo.score}/100</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetricCard label="Title Length" value={`${auditData.seo.titleLength}ch`} status={auditData.seo.titleOk ? "pass" : "warn"} />
                    <MetricCard label="Desc Length" value={`${auditData.seo.descriptionLength}ch`} status={auditData.seo.descriptionOk ? "pass" : "warn"} />
                    <MetricCard label="H1 Tags" value={auditData.seo.h1Count} status={auditData.seo.h1Ok ? "pass" : "fail"} />
                    <MetricCard label="Imgs w/o Alt" value={auditData.seo.imagesWithoutAlt} status={auditData.seo.imagesWithoutAlt === 0 ? "pass" : "warn"} />
                    <MetricCard label="robots.txt" value={auditData.seo.robotsTxtExists ? "✅" : "❌"} status={auditData.seo.robotsTxtExists ? "pass" : "fail"} />
                    <MetricCard label="Sitemap" value={auditData.seo.sitemapExists ? "✅" : "❌"} status={auditData.seo.sitemapExists ? "pass" : "fail"} />
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-white/40">Title</p>
                    <p className="text-sm text-white">{auditData.seo.title ?? "Not found"}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-white/40">Meta Description</p>
                    <p className="text-sm text-white">{auditData.seo.description ?? "Not found"}</p>
                  </div>
                  {auditData.seo.issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Security & Headers</h2>
                    <span className={`text-2xl font-bold ${auditData.security.score >= 70 ? "text-emerald-400" : auditData.security.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>{auditData.security.score}/100</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: "HTTPS Redirect", value: auditData.security.httpsRedirect },
                      { label: "SSL Valid", value: auditData.security.sslValid },
                      { label: "X-Frame-Options", value: !!auditData.security.headerXFrameOptions },
                      { label: "Content-Security-Policy", value: !!auditData.security.headerCSP },
                      { label: "HSTS", value: !!auditData.security.headerHSTS },
                      { label: "X-Content-Type-Options", value: !!auditData.security.headerXContentType },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 rounded-xl p-3 ${item.value ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                        <span className="text-lg">{item.value ? "✅" : "❌"}</span>
                        <span className="text-sm text-white/80">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  {auditData.security.sslExpiry && (
                    <div className="bg-white/5 rounded-xl p-4 text-sm text-white/60">
                      SSL Expires: {new Date(auditData.security.sslExpiry).toLocaleDateString()} ({auditData.security.sslDaysRemaining} days remaining)
                    </div>
                  )}
                  {auditData.security.issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
                </div>
              )}

              {/* Forms Tab */}
              {activeTab === "forms" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Form & Usability Audit</h2>
                    <span className="text-sm text-indigo-300 font-medium">
                      {auditData.forms.totalForms} form(s) found
                    </span>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
                    Forms are the primary way users interact with your site. We analyze them for accessibility (labels/placeholders),
                    functional validation (phone numbers, credit cards), and usability markers.
                  </p>

                  {auditData.forms.forms.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {auditData.forms.forms.map((f, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-white">Form #{i + 1}</p>
                            <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded uppercase">{f.method}</span>
                          </div>
                          <p className="text-xs text-white/40 font-mono truncate">{f.action || "No Action URL"}</p>
                          <div className="flex gap-2 pt-1">
                            <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">{f.fieldCount} fields</span>
                            {f.hasSubmitButton ? (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Submit Button</span>
                            ) : (
                              <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">❌ No Submit</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    {auditData.forms.issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
                    {auditData.forms.totalForms === 0 && (
                      <div className="text-center py-12 text-white/30 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-3xl mb-2">📭</p>
                        <p className="text-sm">No forms detected on this page.</p>
                      </div>
                    )}
                    {auditData.forms.totalForms > 0 && auditData.forms.issues.length === 0 && (
                      <div className="text-center py-12 text-emerald-400/60 bg-emerald-500/5 rounded-2xl">
                        <p className="text-sm font-medium">✓ All forms passed initial usability checks!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="text-center text-xs text-white/20 pb-4">
          QA-Auditor Web Diagnostics · Professional Automated Testing
        </footer>
      </main>
    </>
  );
}
