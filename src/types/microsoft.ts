import { ITodoAppUser } from "@/types/index";

export type IMicrosoftCreateBy = {
  user: IMicrosoftMember;
};

export type IMicrosoftAssignedBy = IMicrosoftCreateBy;

export type IMicrosoftAssign = {
  assignedBy: IMicrosoftAssignedBy;
};

export type IMicrosoftTask = {
  id: string;
  title: string;
  planId: string;
  percentComplete: number;
  createdDateTime: Date;
  dueDateTime?: Date;
  completedDateTime?: Date;
  createdBy?: IMicrosoftCreateBy;
  assignments: [IMicrosoftAssign];
  userCreateBy?: number | null;
};

export type IMicrosoftRefresh = {
  todoAppUser: ITodoAppUser;
};

export type IMicrosoftToken = {
  token_type: string;
  score: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export type IMicrosoftMember = Record<string, any> & {
  id: string;
}

export type IMicrosoftErrorResponse = {
  error: {
    code: string;
    message: string;
    innerError: {
      requestId: string;
      date: string;
    };
  };
}