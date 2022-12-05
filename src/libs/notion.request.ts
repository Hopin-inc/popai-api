// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Client } from '@notionhq/client';

export function notionRequest(){
  const notion = new Client({ auth: process.env.NOTION_ACCESS_TOKEN })
  return notion;
}