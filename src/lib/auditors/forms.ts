// src/lib/auditors/forms.ts
// Analyzes HTML forms for accessibility and validation best practices.

import type { Issue, FormFieldResult, FormResult, FormsAuditResult, Severity } from "../types";
import { nanoid } from "../utils";

/** Extracts text content of all form elements from raw HTML using regex parsing. */
async function analyzeFormWithAI(formHtml: string): Promise<Issue[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") return [];

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert QA automation tester. I need you to check the functional validation rules of the following HTML form.
Apply the following strict functional validation rules:
1. Field name (label/associated text) and placeholder name should be exactly the SAME (e.g., if label is "First Name", the placeholder should match it exactly instead of being generic like "Your name" or missing). If they do not match exactly, flag it as a validation mismatch.
2. Phone number fields MUST only accept exactly 10 digits. Check if minlength="10", maxlength="10", or equivalent patterns are implemented.
3. No characters (non-numeric text) should be applicable or accepted for: Phone Number, Credit Card Number, CVV, or Zip Code fields. They must enforce strictly numeric inputs (using type="number", pattern="[0-9]*", or similar pattern constraints).
4. If there is any credit card number field, identify it (e.g., check the label name, input name, or placeholder for "card number", "credit card", etc.). Before validating or submitting, it must be verified to accept exactly 16 digits.
5. Checkbox Behavioral Verification: If the form contains any checkboxes (like "Terms & Conditions", consent, or marketing agreements), check if unchecking the checkbox stops submission and validates all other required fields. If a checkbox is not marked as "required" or lacks proper validation checks when unchecked, flag it as a critical/high vulnerability.

Form HTML:
${formHtml}

If any rule is violated based on the HTML provided, report it. If a field type doesn't exist in the form (e.g., no credit card field), skip that rule.

Respond ONLY with valid JSON matching this schema:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "title": "Short title describing the validation failure",
      "testScenario": "Simple, non-technical description of the rule being tested (e.g., 'Testing if phone number fields are secure')",
      "testStep": "Step-by-step test instructions written in extremely simple, non-technical plain English (e.g., '1. Locate the phone number box. 2. Try typing letters in it. 3. Check if letters are blocked.'). Keep it completely free of coding terms so any manager or user can easily understand it.",
      "description": "Clear explanation of what is wrong or missing in a simple, friendly, and non-technical way so that any person in management immediately understands the issue.",
      "whyItMatters": "Explain the business impact simply (e.g., 'If visitors enter wrong phone numbers, we will lose sales and cannot call them back.')",
      "recommendation": "Simple, actionable instruction on how to fix it"
    }
  ]
}

If no issues are found, return { "issues": [] };`;;

    // Retry logic for rate limit (429) errors with exponential backoff
    let response;
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        break; // Success — exit retry loop
      } catch (retryErr: any) {
        const isRateLimit = retryErr?.status === 429 || retryErr?.message?.includes("429") || retryErr?.message?.includes("RESOURCE_EXHAUSTED");
        if (isRateLimit && attempt < maxRetries) {
          const waitSec = Math.pow(2, attempt + 1) * 5; // 10s, 20s, 40s
          console.warn(`[AI] Form analysis rate limited (429). Retrying in ${waitSec}s... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, waitSec * 1000));
        } else {
          throw retryErr;
        }
      }
    }
    if (!response) return [];

    const content = response.text ?? "{}";
    const parsed = JSON.parse(content);
    return (parsed.issues ?? []).map((issue: { severity: Severity; title: string; description: string; recommendation: string; testScenario?: string; testStep?: string; whyItMatters?: string }) => ({
      id: nanoid(),
      severity: issue.severity ?? "medium",
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation,
      testScenario: issue.testScenario,
      testStep: issue.testStep,
      whyItMatters: issue.whyItMatters,
    }));
  } catch (err) {
    console.error("[AI] Form analysis failed:", err);
    return [];
  }
}

/** Extracts text content of all form elements from raw HTML using regex parsing. */
function parseForms(html: string): Array<{
  action: string | null;
  method: string;
  innerHtml: string;
}> {
  const formRegex = /<form([^>]*)>([\s\S]*?)<\/form>/gi;
  const forms: Array<{ action: string | null; method: string; innerHtml: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = formRegex.exec(html)) !== null) {
    const attrs = match[1];
    const innerHtml = match[2];

    const actionMatch = attrs.match(/action=["']([^"']*)["']/i);
    const methodMatch = attrs.match(/method=["']([^"']*)["']/i);

    forms.push({
      action: actionMatch?.[1] ?? null,
      method: methodMatch?.[1]?.toUpperCase() ?? "GET",
      innerHtml,
    });
  }

  return forms;
}

function parseFields(formHtml: string): FormFieldResult[] {
  const fieldRegex = /<(input|textarea|select)([^>]*)>/gi;
  const fields: FormFieldResult[] = [];

  let match: RegExpExecArray | null;
  while ((match = fieldRegex.exec(formHtml)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];

    const typeMatch = attrs.match(/type=["']([^"']*)["']/i);
    const nameMatch = attrs.match(/name=["']([^"']*)["']/i);
    const idMatch = attrs.match(/id=["']([^"']*)["']/i);

    const fieldId = idMatch?.[1];
    const hasLabel = fieldId
      ? new RegExp(`for=["']${fieldId}["']`, "i").test(formHtml)
      : false;

    fields.push({
      tag,
      type: typeMatch?.[1] ?? null,
      name: nameMatch?.[1] ?? null,
      required: /\brequired\b/i.test(attrs),
      hasPattern: /\bpattern=/.test(attrs),
      hasMaxlength: /\bmaxlength=/.test(attrs),
      hasLabel,
      hasPlaceholder: /\bplaceholder=/.test(attrs),
    });
  }

  return fields;
}

export async function auditForms(html: string, runAI: boolean = true): Promise<FormsAuditResult> {
  const rawForms = parseForms(html);
  const allIssues: Issue[] = [];
  const formResults: FormResult[] = [];

  for (const rawForm of rawForms) {
    const fields = parseFields(rawForm.innerHtml);
    const hasSubmitButton =
      /type=["']submit["']/i.test(rawForm.innerHtml) ||
      /<button[^>]*>(submit|send|go|search)/i.test(rawForm.innerHtml) ||
      /<button(?![^>]*type=["']button["'])[^>]*>/i.test(rawForm.innerHtml);

    const formIssues: Issue[] = [];

    // Check for fields without labels
    const fieldsWithoutLabels = fields.filter(
      (f) =>
        !["hidden", "submit", "button", "reset", "image"].includes(f.type ?? "") &&
        !f.hasLabel &&
        !f.hasPlaceholder
    );
    if (fieldsWithoutLabels.length > 0) {
      formIssues.push({
        id: nanoid(), severity: "high",
        title: `${fieldsWithoutLabels.length} Form Field(s) Missing Labels`,
        testScenario: "Verify form accessibility and label definition rules.",
        testStep: "1. Parse form elements. 2. Verify if inputs (excluding hidden types) have an associated <label> or 'placeholder' attribute.",
        description: `${fieldsWithoutLabels.length} form field(s) do not contain descriptive labels or placeholders.`,
        whyItMatters: "Form fields without labels are completely inaccessible to screen reader users and raise the risk of user entry errors.",
        recommendation: "Add <label for='fieldId'> elements or at minimum placeholder attributes.",
      });
    }

    // Check for missing required attributes on common fields
    const emailFields = fields.filter((f) => f.type === "email" || f.name?.includes("email"));
    const emailWithoutRequired = emailFields.filter((f) => !f.required);
    if (emailWithoutRequired.length > 0) {
      formIssues.push({
        id: nanoid(), severity: "low",
        title: "Email Field Missing Required Attribute",
        testScenario: "Verify mandatory fields are configured with correct validation indicators.",
        testStep: "1. Locate email input field. 2. Verify existence of the 'required' attribute.",
        description: "The email input field does not enforce required validation.",
        whyItMatters: "Mandatory fields without required validation can be submitted empty, resulting in incomplete contact records and data entry failures.",
        recommendation: 'Add required attribute to all mandatory form fields.',
      });
    }

    if (!hasSubmitButton) {
      formIssues.push({
        id: nanoid(), severity: "medium",
        title: "Form Missing Submit Button",
        testScenario: "Verify usability and presence of form submission triggers.",
        testStep: "1. Scan form DOM tree. 2. Check for button type='submit' or input type='submit'.",
        description: "No form submission trigger button was detected.",
        whyItMatters: "Forms without explicit submit controls fail to support standard keyboard accessibility (such as pressing Enter to submit) and confuse users.",
        recommendation: 'Add a <button type="submit"> or <input type="submit"> to the form.',
      });
    }

    if (runAI) {
      const aiIssues = await analyzeFormWithAI(rawForm.innerHtml);
      formIssues.push(...aiIssues);
    }

    formResults.push({
      action: rawForm.action,
      method: rawForm.method,
      fieldCount: fields.length,
      fields,
      hasSubmitButton,
      issues: formIssues,
    });

    allIssues.push(...formIssues);
  }

  return {
    forms: formResults,
    totalForms: rawForms.length,
    issues: allIssues,
  };
}
