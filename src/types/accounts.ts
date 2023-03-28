import { AccountInfo } from "@/types/auth";

export type AccountInit = AccountInfo & {
  uid: string;
  email: string;
}