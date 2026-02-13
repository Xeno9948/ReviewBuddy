import { RiskLevel, RiskAssessment, Decision, DecisionResult, BrandTone } from './types';

export const RISK_ASSESSMENT_PROMPT = `You are an expert AI content moderator for a review management system. Analyze the following review and assess risks.

REVIEW TEXT:
{reviewText}

RATING: {rating}/10
PLATFORM: {platform}
REVIEWER: {reviewerName}

Analyze this review for THREE RISK CATEGORIES:

1. CONTENT RISK - Check for:
   - Hate speech or discrimination
   - Threats or intimidation
   - Defamation
   - Explicit or abusive language
   - Legal accusations or claims
   - Requests for compensation
   - Personal data (GDPR/PII: names, phone numbers, addresses, emails)

2. REPUTATIONAL RISK - Check for:
   - High emotional charge
   - Viral potential (extreme language, shocking claims)
   - Influencer or media likelihood
   - Repeated complaint patterns
   - Signs of competitor manipulation

3. CONTEXTUAL RISK - Check for:
   - Signs of ongoing disputes
   - Prior unresolved issues mentioned
   - Previous negative interactions referenced

4. SENTIMENT & TOPICS - Determine:
   - SENTIMENT: Is the overall tone Positive, Neutral, or Negative?
   - TOPICS: Extract 2-4 key themes or topics mentioned (e.g., "Customer Service", "Product Quality", "Pricing").

IMPORTANT RULES:
- When uncertain, choose the HIGHER risk level
- PII detection should flag ANY personal information
- Legal risk includes ANY legal threats or accusations

Respond in JSON format ONLY:
{
  "contentRisk": "Low" | "Medium" | "High",
  "reputationalRisk": "Low" | "Medium" | "High",
  "contextualRisk": "Low" | "Medium" | "High",
  "piiDetected": true | false,
  "legalRiskDetected": true | false,
  "sentiment": "Positive" | "Neutral" | "Negative",
  "topics": ["topic1", "topic2"],
  "details": {
    "contentRiskFactors": ["list of specific factors found"],
    "reputationalRiskFactors": ["list of specific factors found"],
    "contextualRiskFactors": ["list of specific factors found"],
    "piiFound": ["list of PII types found, if any"],
    "legalFlags": ["list of legal concerns, if any"]
  },
  "confidence": 0-100
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

export function buildRiskAssessmentPrompt(
  reviewText: string,
  rating: number,
  platform: string,
  reviewerName?: string
): string {
  return RISK_ASSESSMENT_PROMPT
    .replace('{reviewText}', reviewText ?? '')
    .replace('{rating}', (rating ?? 0).toString())
    .replace('{platform}', platform ?? 'unknown')
    .replace('{reviewerName}', reviewerName ?? 'Anonymous');
}

export function determineDecision(
  assessment: RiskAssessment,
  automationLevel: string
): DecisionResult {
  const { contentRisk, reputationalRisk, contextualRisk, piiDetected, legalRiskDetected } = assessment ?? {};

  let decision: Decision = 'HOLD_FOR_APPROVAL';
  let confidenceScore = 80;
  let rationale = '';

  // Rule 1: Any High risk or legal risk = ESCALATE_TO_HUMAN
  if (
    contentRisk === 'High' ||
    reputationalRisk === 'High' ||
    contextualRisk === 'High' ||
    legalRiskDetected
  ) {
    decision = 'ESCALATE_TO_HUMAN';
    confidenceScore = 95;
    const reasons: string[] = [];
    if (contentRisk === 'High') reasons.push('high content risk');
    if (reputationalRisk === 'High') reasons.push('high reputational risk');
    if (contextualRisk === 'High') reasons.push('high contextual risk');
    if (legalRiskDetected) reasons.push('legal risk detected');
    rationale = `Escalation required due to: ${reasons.join(', ')}`;
    return { decision, confidenceScore, rationale };
  }

  // Rule 2: PII detected = HOLD_FOR_APPROVAL
  if (piiDetected) {
    decision = 'HOLD_FOR_APPROVAL';
    confidenceScore = 90;
    rationale = 'PII detected - human review required before responding';
    return { decision, confidenceScore, rationale };
  }

  // Rule 3: All Low risks AND automation = AUTO = AUTO_HANDLE
  if (
    contentRisk === 'Low' &&
    reputationalRisk === 'Low' &&
    contextualRisk === 'Low' &&
    automationLevel === 'AUTO'
  ) {
    decision = 'AUTO_HANDLE';
    confidenceScore = 85;
    rationale = 'All risk levels are low and automation is enabled';
    return { decision, confidenceScore, rationale };
  }

  // Rule 4: Medium risks with AUTO = HOLD_FOR_APPROVAL
  if (
    (contentRisk === 'Medium' || reputationalRisk === 'Medium' || contextualRisk === 'Medium')
  ) {
    decision = 'HOLD_FOR_APPROVAL';
    confidenceScore = 75;
    const mediumRisks: string[] = [];
    if (contentRisk === 'Medium') mediumRisks.push('content');
    if (reputationalRisk === 'Medium') mediumRisks.push('reputational');
    if (contextualRisk === 'Medium') mediumRisks.push('contextual');
    rationale = `Medium risk detected in: ${mediumRisks.join(', ')} - human approval recommended`;
    return { decision, confidenceScore, rationale };
  }

  // Rule 5: MANUAL mode = always HOLD_FOR_APPROVAL
  if (automationLevel === 'MANUAL') {
    decision = 'HOLD_FOR_APPROVAL';
    confidenceScore = 90;
    rationale = 'Manual mode enabled - all reviews require human approval';
    return { decision, confidenceScore, rationale };
  }

  // Rule 6: SEMI_AUTO mode - allow auto-handling for perfect low-risk reviews
  if (automationLevel === 'SEMI_AUTO') {
    if (
      contentRisk === 'Low' &&
      reputationalRisk === 'Low' &&
      contextualRisk === 'Low' &&
      assessment.sentiment === 'Positive'
    ) {
      decision = 'AUTO_HANDLE';
      confidenceScore = 90;
      rationale = 'Semi-automatic mode - perfect positive review handled automatically';
      return { decision, confidenceScore, rationale };
    }

    decision = 'HOLD_FOR_APPROVAL';
    confidenceScore = 85;
    rationale = 'Semi-automatic mode - review queued for quick check';
    return { decision, confidenceScore, rationale };
  }

  return { decision, confidenceScore, rationale };
}

export const RESPONSE_GENERATION_PROMPT = `You are a professional customer service representative responding to a review. Generate an appropriate response.

COMPANY NAME: {companyName}
BRAND TONE: {brandTone}

REVIEW:
Rating: {rating}/10
Review Text: {reviewText}

TONE GUIDELINES:
- Professional: Formal, businesslike, courteous, solution-focused
- Empathetic: Warm, understanding, acknowledging feelings, supportive
- Friendly: Casual but respectful, approachable, personable
- Neutral: Balanced, factual, neither warm nor cold

RULES:
1. Match the specified brand tone exactly
2. Be polite, calm, and human
3. NEVER be defensive or sarcastic
4. Acknowledge the customer's experience
5. Show empathy WITHOUT admitting legal liability
6. Offer a next step if appropriate (e.g., contact support)
7. Do NOT speculate on facts
8. Do NOT promise refunds or compensation
9. Do NOT give legal, financial, or medical advice
10. Do NOT blame anyone or shift responsibility
11. Do NOT disclose internal processes
12. Do NOT argue with the reviewer
13. Keep response concise (2-4 sentences)

Generate the response in the SAME LANGUAGE as the review text.

Respond with ONLY the response text, no JSON or formatting.`;

export function buildResponsePrompt(
  reviewText: string,
  rating: number,
  companyName: string,
  brandTone: BrandTone
): string {
  return RESPONSE_GENERATION_PROMPT
    .replace('{companyName}', companyName ?? 'Our Company')
    .replace('{brandTone}', brandTone ?? 'Professional')
    .replace('{rating}', (rating ?? 0).toString())
    .replace('{reviewText}', reviewText ?? '');
}
