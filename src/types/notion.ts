import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { valueOf } from "@/types/index";

export type INotionTask = {
  last_edited_at: Date;
  created_at: Date;
  created_by: string;
  created_by_id: number;
  closed: boolean;
  deadline: Date;
  dueReminder: number | null;
  is_done: boolean;
  name: string;
  sections: string[];
  section_ids: number[];
  notion_user_id: string[];
  todoapp_reg_id: string;
  todoapp_reg_url: string;
}

export type INotionProperty = valueOf<Pick<PageObjectResponse, "properties">>;
