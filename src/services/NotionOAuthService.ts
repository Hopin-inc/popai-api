import { Service } from "typedi";
import { fetchApi } from "@/libs/request";
import { INotionOAuthToken } from "@/types/notion";

@Service()
export default class NotionOAuthService {
  public async generateToken(code: string, redirectUri: string): Promise<INotionOAuthToken> {
    const basicAuth = Buffer
      .from(`${ process.env.NOTION_CLIENT_ID }:${ process.env.NOTION_CLIENT_SECRET }`)
      .toString("base64");
    return fetchApi<INotionOAuthToken>(
      "https://api.notion.com/v1/oauth/token",
      "POST",
      { grant_type: "authorization_code", code, redirect_uri: redirectUri },
      false,
      null,
      { "Authorization": `Basic ${ basicAuth }` },
    );
  }
}