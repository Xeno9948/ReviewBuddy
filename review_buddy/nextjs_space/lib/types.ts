export type RiskLevel = 'Low' | 'Medium' | 'High';

export type Decision = 'AUTO_HANDLE' | 'HOLD_FOR_APPROVAL' | 'ESCALATE_TO_HUMAN';

export type BrandTone = 'Professional' | 'Empathetic' | 'Friendly' | 'Neutral';

export type AutomationLevel = 'AUTO' | 'SEMI_AUTO' | 'MANUAL';

export type ReviewStatus = 'new' | 'processing' | 'pending_approval' | 'approved' | 'responded' | 'escalated' | 'archived';

export type ResponseStatus = 'pending' | 'generated' | 'approved' | 'published' | 'rejected';

export interface RiskAssessment {
  contentRisk: RiskLevel;
  reputationalRisk: RiskLevel;
  contextualRisk: RiskLevel;
  piiDetected: boolean;
  legalRiskDetected: boolean;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  topics: string[];
  details: {
    contentRiskFactors: string[];
    reputationalRiskFactors: string[];
    contextualRiskFactors: string[];
    piiFound?: string[];
    legalFlags?: string[];
  };
}

export interface DecisionResult {
  decision: Decision;
  confidenceScore: number;
  rationale: string;
}

export interface ReviewData {
  id: string;
  externalId?: string;
  platform: string;
  reviewText: string;
  oneLiner?: string;
  rating: number;
  reviewerName?: string;
  reviewerCity?: string;
  reviewTimestamp: Date;
  contentRisk: RiskLevel;
  reputationalRisk: RiskLevel;
  contextualRisk: RiskLevel;
  piiDetected: boolean;
  legalRiskDetected: boolean;
  decision: Decision;
  confidenceScore: number;
  decisionRationale?: string;
  sentiment?: string;
  topics?: any;
  generatedResponse?: string;
  responseStatus: string;
  humanAssignedId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KiyohReview {
  reviewId: string;
  reviewAuthor: string;
  city?: string;
  rating: number;
  reviewContent?: {
    questionGroup: string;
    questionType: string;
    rating: string | number | boolean;
    order: number;
    questionTranslation?: string;
  }[];
  reviewComments?: string;
  dateSince: string;
  updatedSince: string;
  reviewLanguage?: string;
}

export interface KiyohApiResponse {
  locationId: string;
  locationName?: string;
  averageRating: number;
  numberReviews: number;
  reviews: KiyohReview[];
}

export interface BrandConfigData {
  id: string;
  companyName: string;
  brandTone: BrandTone;
  automationLevel: AutomationLevel;
  escalationThresholds?: string;
  kiyohApiKey?: string;
  kiyohLocationId?: string;
  kiyohTenantId: string;
  googleApiKey?: string;
  googlePlaceId?: string;
  facebookApiKey?: string;
  facebookPageId?: string;
  trustpilotApiKey?: string;
  trustpilotBusinessId?: string;
  geminiApiKey?: string;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  reviewId?: string;
  actionType: string;
  riskAssessment?: RiskAssessment;
  decision?: Decision;
  decisionRationale?: string;
  confidenceScore?: number;
  generatedResponse?: string;
  humanAction?: string;
  humanUserId?: string;
  overrideReason?: string;
  previousDecision?: string;
  newDecision?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SystemHealthMetrics {
  totalReviews: number;
  autoHandledCount: number;
  holdForApprovalCount: number;
  escalatedCount: number;
  escalationRate: number;
  overrideFrequency: number;
  avgConfidenceScore: number;
  alertTriggered: boolean;
  alertMessage?: string;
}
