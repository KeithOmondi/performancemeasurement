// types.ts
import { type ReactNode } from "react";

export interface AssignPrefill {
  strategicPlanId?: string;
  objectiveId?: string;
  activityId?: string;
  assigneeId?: string;
  assignmentType?: "Individual" | "Team";
}

export interface IUser {
  id?: string;
  _id?: string;
  name: string;
  email?: string;
  isActive: boolean;
  title?: string;
  role?: string;
}

export interface MetricCardProps {
  label: string;
  icon: ReactNode;
  value: string | number;
  // FIX: Changed 'any' to 'string | number' to satisfy ESLint
  onChange: (val: string | number) => void; 
  disabled?: boolean;
  isString?: boolean;
}

export interface UserMultiSelectProps {
  label: string;
  allUsers: IUser[];
  selectedIds: string[];
  excludeIds?: string[];
  onChange: (ids: string[]) => void;
}

export interface InlineCreateTeamProps {
  users: IUser[];
  onCreated: (teamId: string) => void;
  onCancel: () => void;
}

export interface SuperAdminAssignProps {
  onClose: () => void;
  prefill?: AssignPrefill;
}