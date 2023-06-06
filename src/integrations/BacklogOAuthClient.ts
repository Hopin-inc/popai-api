import { Service } from "typedi";
import { OAuth2 } from "backlog-js";
import "isomorphic-fetch";
import "isomorphic-form-data";
import { OAuth2 as OAuth2Entity } from "backlog-js/dist/types/entity";

@Service()
export default class BacklogOAuthClient {
  private client: OAuth2;

  constructor() {
    this.client = new OAuth2({
      clientId: process.env.BACKLOG_CLIENT_ID,
      clientSecret: process.env.BACKLOG_CLIENT_SECRET,
    });
  }

  public async generateAuthUrl(redirectUri: string, host: string, state: string): Promise<string> {
    return this.client.getAuthorizationURL({ redirectUri, host, state });
  }

  public async generateToken(code: string, redirectUri: string, host: string): Promise<OAuth2Entity.AccessToken> {
    return this.client.getAccessToken({ code, redirectUri, host });
  }

  public async regenerateToken(refreshToken: string, host: string): Promise<OAuth2Entity.AccessToken> {
    return this.client.refreshAccessToken({ refreshToken, host });
  }
}
