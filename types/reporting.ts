// types/reporting.ts
export enum IssuePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum IssueCategory {
  INFRASTRUCTURE = "Infrastructure",
  UTILITIES = "Utilities",
  ENVIRONMENT = "Environment",
  PUBLIC_SAFETY = "Public Safety",
  SOCIAL_SERVICES = "Social Services",
  OTHER = "Other",
}

export interface AIAnalysis {
  category: IssueCategory;
  subcategory: string;
  summary: string;
  department?: string;
  priority: IssuePriority;
  suggested_actions: string[];
  keywords: string[];
  location: string;
  urgency_assessment: string;
}

export interface ReportData {
  description: string;
  aiAnalysis: AIAnalysis | null;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
    city?: string;
    province?: string;
    country?: string;
    manualPin?: boolean;
  };
  images?: string[]; // Base64 or URLs
}

export enum WizardStep {
  DESCRIBE_ISSUE = 1,
  ADD_LOCATION = 2,
  REVIEW_SUBMIT = 3,
  SUBMISSION_SUCCESS = 4,
}
