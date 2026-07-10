/* ─────────────────────────────────────────────────────────────────────────────
   indicator.types.ts
   All shared types for the indicator domain.
───────────────────────────────────────────────────────────────────────────── */

/* ─── ENUMS / UNIONS ─────────────────────────────────────────────────────── */

export type IndicatorStatus =
  | "Pending"
  | "Awaiting Admin Approval"
  | "Correction Needed"
  | "Rejected by Admin"
  | "Awaiting Super Admin"
  | "Rejected by Super Admin"
  | "Completed"
  | "Unassigned";

export type ReviewAction =
  | "Submitted"
  | "Resubmitted"
  | "Verified"
  | "Correction Requested"
  | "Approved"
  | "Partially Approved"
  | "Rejected"
  | "Reopened"
  | "Submission Deleted"
  | "Document Description Updated"
  | "Reassigned"
  | "Users Added"
  | "Users Removed";

export type ReviewerRole = "user" | "admin" | "superadmin";

export type AssignmentType = "User" | "Team";

export type ReportingCycle = "Quarterly" | "Annual";

export type DocumentStatus = "Pending" | "Accepted" | "Rejected";

export type SubmissionReviewStatus =
  | "Pending"
  | "Verified"
  | "Accepted"
  | "Rejected"
  | "Correction Needed"
  | "Partially Approved";

export type Quarter = 0 | 1 | 2 | 3 | 4;

/* ─── ASSIGNEE (NEW) ──────────────────────────────────────────────────────── */

export interface IAssignee {
  userId: string;
  isPrimary: boolean;
  name: string;
  email: string;
  pjNumber?: string;
}

/* ─── DOCUMENT ───────────────────────────────────────────────────────────── */

export interface IDocument {
  id?: string;
  submissionId?: string;
  evidenceUrl: string;
  evidencePublicId: string;
  fileType: "image" | "video" | "raw";
  fileName?: string;
  description?: string;
  status?: DocumentStatus;
  rejectionReason?: string;
  uploadedAt?: string;
}

/* ─── SUBMISSION ─────────────────────────────────────────────────────────── */

export interface ISubmission {
  id: string;
  indicatorId?: string;
  quarter: Quarter;
  year: number;
  documents: IDocument[];
  notes: string;
  adminDescriptionEdit?: string;
  submittedAt: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: SubmissionReviewStatus;
  adminComment?: string;
  resubmissionCount: number;
  approvedAmount?: number;
  previousRejectionReason?: string;
  reviewedAt?: string;
  submittedById?: string;
  submittedByName?: string;
}

/* ─── REVIEW HISTORY ─────────────────────────────────────────────────────── */

export interface IReviewHistory {
  id?: string;
  indicatorId?: string;
  action: ReviewAction;
  reason: string;
  reviewerRole: ReviewerRole;
  reviewedBy: string;
  reviewedByName?: string;
  at: string;
  nextDeadline?: string;
  approvedAmount?: number;
  isPartial?: boolean;
  quarter?: number;
  year?: number;
}

/* ─── PARTIAL APPROVAL ───────────────────────────────────────────────────── */

export interface IPartialApproval {
  id: string;
  action: string;
  reason: string;
  approvedAmount: number;
  quarter: number;
  year: number;
  approvedAt: string;
  approvedBy: string;
  isPartial: boolean;
}

/* ─── INDICATOR ──────────────────────────────────────────────────────────── */

export interface IIndicator {
  id: string;
  status: IndicatorStatus;
  weight: number;
  unit: string;
  target: number;
  progress: number;
  deadline: string;
  instructions?: string;
  currentTotalAchieved: number;
  activeQuarter: Quarter;
  reportingCycle: ReportingCycle;
  assignmentType: AssignmentType;
  /** Raw assignee UUID — kept for backwards compat with existing components */
  assignee: string;
  assigneeId?: string;
  assignedBy: string;
  strategicPlanId: string;
  objectiveId: string;
  activityId: string;
  /* Resolved display fields from JOIN */
  assigneeDisplayName?: string;
  assignedByName?: string;
  perspective?: string;
  objectiveTitle?: string;
  activityDescription?: string;
  assigneePjNumber?: string;
  /* Timestamps */
  createdAt?: string;
  updatedAt?: string;
  /* Enriched relations (only present after fetchById) */
  submissions?: ISubmission[];
  reviewHistory?: IReviewHistory[];
  /* Computed flags (added client-side after fetch) */
  needsAction?: boolean;
  isOverdue?: boolean;
  completionPercentage?: number;
  adminOverallComments?: string;
  /* Multi-assignee fields (NEW) */
  isMultiAssignee?: boolean;
  allAssignees?: IAssignee[];
}

/* ─── QUEUE ITEM ─────────────────────────────────────────────────────────── */

export interface IQueueItem {
  id: string;
  submissionId: string;
  indicatorId: string;
  indicatorTitle: string;
  submittedBy: string;
  year?: number;
  submittedOn: string;
  status: string;
  quarter: string;
  achievedValue: number;
  isReviewed: boolean;
  reviewStatus: string;
  adminComment?: string;
  notes?: string;
  documentsCount: number;
  documents: IDocument[];
}

/* ─── COUNTS ─────────────────────────────────────────────────────────────── */

export interface IIndicatorCounts {
  total: number;
  assigned: number;
  unassigned: number;
  review: number;
  overdue: number;
  perspectives: Record<string, number>;
}

/* ─── API PAYLOADS ───────────────────────────────────────────────────────── */

export interface ISuperAdminReviewPayload {
  decision: "Approved" | "Rejected";
  reason?: string;
  progressOverride: number;
  isPartialApproval?: boolean;
  year?: number;
  quarter?: number;
}

export interface IAssignPayload {
  id: string;
  assigneeId: string;
  assigneeModel?: AssignmentType;
}

/* ─── NEW: Multi-Assignee Payloads ──────────────────────────────────────── */

export interface IReassignPayload {
  id: string;
  newAssigneeId: string;
  newAssigneeModel?: AssignmentType;
  reason?: string;
}

export interface IAddUsersPayload {
  id: string;
  userIds: string[];
  role?: string;
  refetchAfter?: boolean;
}

export interface IRemoveUsersPayload {
  id: string;
  userIds: string[];
  refetchAfter?: boolean;
}

/* ─── CREATE / UPDATE PAYLOADS ──────────────────────────────────────────── */

export interface ICreateIndicatorPayload {
  strategicPlanId: string;
  objectiveId: string;
  activityId: string;
  assignee?: string;
  assignmentType?: AssignmentType;
  reportingCycle?: ReportingCycle;
  weight?: number;
  unit?: string;
  target?: number;
  deadline?: string;
  instructions?: string;
  activeQuarter?: number;
  /** Array of additional user IDs for multi-assignee (NEW) */
  additionalAssignees?: string[];
}

export interface IUpdateIndicatorPayload {
  weight?: number;
  target?: number;
  deadline?: string;
  instructions?: string;
  reportingCycle?: ReportingCycle;
}