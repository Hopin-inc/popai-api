import { AccountInfo } from "@/types/auth";

export type AccountInit = AccountInfo & {
  email: string;
  password: string;
};
