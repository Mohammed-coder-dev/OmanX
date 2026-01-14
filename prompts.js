// prompts.js — OmanX policies + knowledge formatting helpers

export const SYSTEM_POLICY_SCHOLAR = `
You are OmanX, a government-ready AI onboarding assistant for Omani scholars in the United States.

STRICT MODE (Scholar Lane):
- Use ONLY the provided KNOWLEDGE for factual claims about policies, requirements, or official processes.
- If the KNOWLEDGE does not cover something, say you do not have enough approved information and direct the student to the appropriate official office (university international office/DSO, embassy, ministry).
- HIGH-STAKES: immigration/visa/status, legal, medical, safety, scholarship compliance:
  - Do NOT guess.
  - Do NOT provide legal/medical advice.
  - Escalate to official authorities.
- Do not invent links or OmanX pages.

OUTPUT STYLE:
- Default to a clean, structured answer.
- Include a "References" section ONLY if you actually used items from the KNOWLEDGE.
`.trim();

export const SYSTEM_POLICY_LOCAL = `
You are OmanX Local Guide (Lifestyle Lane).

LOCAL MODE:
- Answer naturally and helpfully for local life topics (restaurants, groceries, transit, services).
- Do NOT force a rigid template.
- Do NOT cite "OmanX references" unless relevant.
- You may ask 1 quick follow-up question if needed (budget, cuisine, walking distance).
- If the user asks HIGH-STAKES topics (immigration/legal/medical/emergency), advise contacting official offices/911 and keep it conservative.

IMPORTANT:
- If you do not have real data for nearby places, be honest and recommend how to find the best options nearby (Google Maps/Yelp), and ask preferences.
`.trim();

/**
 * buildKnowledgeText
 * Turns knowledge.json into a readable block the model can use.
 * Keep it simple, stable, and audit-friendly.
 */
export function buildKnowledgeText(knowledgeJson) {
  if (!knowledgeJson || typeof knowledgeJson !== "object") return "";

  // Accept either:
  // 1) { sectionName: "text", ... }
  // 2) { sectionName: { summary, bullets, links }, ... }
  // 3) { items: [ ... ] } style (optional)
  const lines = [];

  // If it has an "items" array, render it
  if (Array.isArray(knowledgeJson.items)) {
    for (const item of knowledgeJson.items) {
      if (!item) continue;
      const title = item.title || item.name || "Item";
      lines.push(`## ${title}`);

      if (item.summary) lines.push(String(item.summary));
      if (Array.isArray(item.bullets) && item.bullets.length) {
        for (const b of item.bullets) lines.push(`- ${b}`);
      }
      if (Array.isArray(item.links) && item.links.length) {
        lines.push(`References:`);
        for (const l of item.links) lines.push(`- ${l}`);
      }
      lines.push("");
    }
    return lines.join("\n").trim();
  }

  // Otherwise render key/value sections
  for (const [key, value] of Object.entries(knowledgeJson)) {
    lines.push(`## ${key}`);

    if (typeof value === "string") {
      lines.push(value.trim());
      lines.push("");
      continue;
    }

    if (value && typeof value === "object") {
      if (value.summary) lines.push(String(value.summary).trim());

      if (Array.isArray(value.bullets) && value.bullets.length) {
        for (const b of value.bullets) lines.push(`- ${b}`);
      }

      if (Array.isArray(value.links) && value.links.length) {
        lines.push(`References:`);
        for (const l of value.links) lines.push(`- ${l}`);
      }

      lines.push("");
      continue;
    }

    // Fallback
    lines.push(String(value));
    lines.push("");
  }

  return lines.join("\n").trim();
}
