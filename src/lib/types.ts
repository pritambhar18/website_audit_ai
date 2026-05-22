// src/lib/types.ts
// Central type definitions for the entire audit system

export type Severity = "critical" | "high" | "medium" | "low" | "pass";

export interface Issue {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  testScenario?: string;
  testStep?: string;
  whyItMatters?: string;
  device?: string;
  url?: string;
  screenshotBase64?: string;
}

// ─── Link Audit ──────────────────────────────────────────────────────────────

export interface LinkResult {
  url: string;
  status: number | null;
  statusText: string;
  ok: boolean;
  redirectedTo?: string;
  error?: string;
}

export interface LinksAuditResult {
  total: number;
  ok: number;
  broken: number;
  redirects: number;
  links: LinkResult[];
  screenshotBase64?: string;
  issues: Issue[];
}

// ─── Responsive / Screenshot Audit ───────────────────────────────────────────

export type DeviceCategory = "mobile" | "tablet" | "desktop";

export interface DeviceProfile {
  name: string;
  category: DeviceCategory;
  width: number;
  height: number;
  userAgent?: string;
  orientation?: "portrait" | "landscape";
}

export interface DeviceResult {
  device: DeviceProfile;
  screenshotBase64: string;
  aiIssues: Issue[];
  loadTimeMs: number;
}

export interface ResponsiveAuditResult {
  devices: DeviceResult[];
  issues: Issue[];
}

// ─── SEO Audit ───────────────────────────────────────────────────────────────

export interface SEOResult {
  title: string | null;
  titleLength: number;
  titleOk: boolean;
  description: string | null;
  descriptionLength: number;
  descriptionOk: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogImageBase64?: string | null;
  h1Count: number;
  h1Ok: boolean;
  imagesWithoutAlt: number;
  robotsTxtExists: boolean;
  robotsTxtContent: string | null;
  sitemapExists: boolean;
  canonicalUrl: string | null;
  structuredDataCount: number;
  issues: Issue[];
  score: number; // 0-100
}

export interface AutomatedCheckResult {
  passed: boolean;
  screenshotBase64: string;
  reportUrl: string;
  resultText: string;
}

// ─── Security Audit ──────────────────────────────────────────────────────────

export interface SecurityResult {
  httpsRedirect: boolean;
  sslExpiry: string | null;
  sslDaysRemaining: number | null;
  sslValid: boolean;
  dnsARecords: string[];
  dnsWwwRecords: string[];
  headerXFrameOptions: string | null;
  headerCSP: string | null;
  headerHSTS: string | null;
  headerXContentType: string | null;
  headerXXSSProtection: string | null;
  safeBrowsing: "safe" | "unsafe" | "unknown";
  mozillaGrade?: string | null;
  htmlValidationErrors: number;
  htmlValidationWarnings: number;
  issues: Issue[];
  score: number; // 0-100
  automatedHttp2?: AutomatedCheckResult;
  automatedSsl?: AutomatedCheckResult;
  automatedSafeBrowsing?: AutomatedCheckResult;
  automatedDns?: AutomatedCheckResult;
  automatedHttpsRedirect?: AutomatedCheckResult;
  automatedHtmlOptimisation?: AutomatedCheckResult;
  automatedDomainExpiry?: AutomatedCheckResult & { expiryText?: string };
  automatedRedirectChain?: AutomatedCheckResult;
}

// ─── Forms Audit ─────────────────────────────────────────────────────────────

export interface FormFieldResult {
  tag: string;
  type: string | null;
  name: string | null;
  required: boolean;
  hasPattern: boolean;
  hasMaxlength: boolean;
  hasLabel: boolean;
  hasPlaceholder: boolean;
}

export interface FormResult {
  action: string | null;
  method: string;
  fieldCount: number;
  fields: FormFieldResult[];
  hasSubmitButton: boolean;
  issues: Issue[];
}

export interface FormsAuditResult {
  forms: FormResult[];
  totalForms: number;
  issues: Issue[];
}

// ─── Full Audit Result ────────────────────────────────────────────────────────

export interface AuditResult {
  sessionId: string;
  url: string;
  auditedAt: string;
  durationMs: number;
  links: LinksAuditResult;
  responsive: ResponsiveAuditResult;
  seo: SEOResult;
  security: SecurityResult;
  forms: FormsAuditResult;
  performance: import("./auditors/performance").PerformanceResult;
  overallScore: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

// ─── SSE Progress Events ──────────────────────────────────────────────────────

export interface ProgressEvent {
  step: string;
  stepIndex: number;
  totalSteps: number;
  progress: number; // 0-100
  message: string;
  data?: unknown;
  error?: string;
  done?: boolean;
  sessionId?: string;
}
