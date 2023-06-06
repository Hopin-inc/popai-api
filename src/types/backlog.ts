import { ActivityTypeIds } from "@/consts/backlog";

export type BacklogWebhookPayload<
  T extends SingleIssuePayload | MultiIssuesPayload | MilestonePayload | MilestoneChangedPayload
    = SingleIssuePayload | MultiIssuesPayload | MilestonePayload | MilestoneChangedPayload
> = BaseWebhookPayload & T;
type BaseWebhookPayload = {
  id: number;
  project: BacklogProject;
  notifications: any[];
  createdUser: BacklogUser;
  created: string;
  content: Content;
};
export type SingleIssuePayload = {
  type:
    | ActivityTypeIds.ISSUE_CREATED
    | ActivityTypeIds.ISSUE_UPDATED
    | ActivityTypeIds.ISSUE_DELETED
    | ActivityTypeIds.ISSUE_COMMENTED;
  content: BacklogIssue;
};
export type MultiIssuesPayload = {
  type: ActivityTypeIds.ISSUE_MULTI_UPDATED;
  content: {
    tx_id: string;
    comment: BacklogComment;
    link: {
      id: string;
      key_id: string;
      title: string;
      comment: BacklogComment;
    }[];
    changes: Change<MultiIssuesPayload>[];
  };
};
export type MilestonePayload = {
  type: ActivityTypeIds.MILESTONE_CREATED | ActivityTypeIds.MILESTONE_DELETED;
  content: BacklogMilestone;
};
export type MilestoneChangedPayload = {
  type: ActivityTypeIds.MILESTONE_UPDATED;
  content: {
    name: string;
    changes: Change<MilestoneChangedPayload>[];
  };
};

type Content = {
  id: number;
  key_id: number;
};
type Change<T> = {
  field: T extends MultiIssuesPayload
    ? "status" | "assigner" | "limitDate" | "startDate" | "milestone"
    : T extends MilestoneChangedPayload
      ? "name" | "startDate" | "referenceDate" | "description"
      : never;
  old_value?: string;
  new_value: string;
  type: string;
}

export type BacklogIssue = {
  id: number;
  summary: string;
  description: string;
  parentIssueId: number | null;
  assignee: BacklogUser | null;
  customFields: any[];
  attachments: any[];
  startDate: string;
  dueDate: string;
  status: BacklogStatus | null;
  priority: BacklogStatus | null;
  resolution: BacklogStatus | null;
  estimatedHours: number | null;
  actualHours: number | null;
  issueType: BacklogIssueType;
  milestone: BacklogMilestone[];
  category: BacklogCategory[];
  comment: BacklogComment | null;
};
export type BacklogIssueWithDetail = BacklogIssue & {
  projectId: number;
  issueKey: string;
  keyId: number;
  createdUser: BacklogUser;
  created: string;
  updatedUser: BacklogUser;
  updated: string;
  sharedFiles: any[];
  stars: any[];
};
type BacklogIssueType = {
  color: string;
  name: string;
  displayOrder: number;
  id: number;
  projectId: number | null;
};
type BacklogStatus = {
  name: string;
  id: number;
};
type BacklogCategory = {
  name: string;
  id: number | null;
  displayOrder: number;
};
export type BacklogMilestone = {
  id: number | null;
  name: string;
  description: string;
  start_date: string;
  reference_date: string;
};
type BacklogComment = {
  id?: number;
  content: string;
};

export type GetUserListResponse = BacklogUser[];
export type BacklogUser = {
  id: number;
  userId: string;
  name: string;
  roleType: number;
  lang: "ja" | "en";
  mailAddress: string;
  lastLoginTime: string;
};

export type GetProjectListResponse = BacklogProject[];
export type BacklogProject = {
  id: number;
  projectKey: string;
  name: string;
  chartEnabled: boolean;
  useResolvedForChart: boolean;
  subtaskingEnabled: boolean;
  projectLeaderCanEditProjectLeader: boolean;
  useWiki: boolean;
  useFileSharing: boolean;
  useWikiTreeView: boolean;
  useSubversion: boolean;
  useGit: boolean;
  useOriginalImageSizeAtWiki: boolean;
  textFormattingRule: string;
  archived: boolean;
  displayOrder: number;
  useDevAttributes: boolean;
};

export type GetMilestonesResponse = BacklogMilestoneDetail[];
export type BacklogMilestoneDetail = {
  id: number;
  projectId: number;
  name: string;
  description: string;
  startDate: string | null;
  releaseDueDate: string | null;
  archived: boolean;
  displayOrder: number;
};

export type GetWebhookListResponse = BacklogWebhook[];
export type PostWebhookResponse = BacklogWebhook;
export type BacklogWebhook = {
  id: number;
  name: string;
  description: string;
  hookUrl: string;
  allEvent: boolean;
  activityTypeIds: number[];
  createdUser: BacklogUser;
  created: string;
  updatedUser: BacklogUser;
  updated: string;
};

export type GetStatusListResponse = BacklogStatus[];

export type GetIssueListResponse = BacklogIssueWithDetail[];
export type GetIssueResponse = BacklogIssueWithDetail;
