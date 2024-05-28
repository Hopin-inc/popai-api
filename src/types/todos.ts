export type TodoFilter = {
  status: string | null;
  assignee: string | null;
  startDate: string;
  endDate: string;
  perPage?: number;
  page?: number;
  order?: string;
};
