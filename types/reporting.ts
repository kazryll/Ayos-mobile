// types/reporting.ts
export enum IssuePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum IssueCategory {
  INFRASTRUCTURE = 'Infrastructure',
  UTILITIES = 'Utilities',
  ENVIRONMENT = 'Environment',
  PUBLIC_SAFETY = 'Public Safety',
  SOCIAL_SERVICES = 'Social Services',
  OTHER = 'Other'
}

export interface AIAnalysis {
  category: IssueCategory;
  subcategory: string;
  summary: string;
  priority: IssuePriority;
  suggested_actions: string[];
}

export interface ReportData {
  description: string;
  aiAnalysis: AIAnalysis | null;
  timestamp: string;
}

export enum WizardStep {
  DESCRIBE_ISSUE = 1,
  REVIEW_ANALYSIS = 2,
  SUBMISSION_SUCCESS = 3
}