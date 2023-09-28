import logger from "@/libs/logger";
import axios from "axios";
import { Request } from "express";
import jwt from "jsonwebtoken";
import { Service } from "typedi";

@Service()
export default class LineWorksRepository {
  static getInstallation: any;

  public async getInstallation(req: Request) {
    const CLIENT_ID = req.body.client_id;
    const CLIENT_SECRET = req.body.client_secret;
    const SERVICE_ACCOUNT = req.body.service_account;
    const PRIVATE_KEY = req.body.secret_key;

    const assertion = await this.getJWT(CLIENT_ID, SERVICE_ACCOUNT, PRIVATE_KEY);

    const uri = "https://auth.worksmobile.com/oauth2/v2.0/token";

    const params = new URLSearchParams({
      assertion: assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "bot user.read",
    });

    axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded;";

    //https Post Request
    return await axios
      .post(uri, params)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        if (error.response) {
          logger.info(`res state: ${ error.response.statusText } ${ error.response.status }`);
          logger.error(`res header: ${ error.response.headers }`);
          logger.error(`res data: ${ JSON.stringify(error.response.data) }`);
        } else if (error.request) {
          logger.error(error.request);
        } else {
          logger.error(error.message);
        }
        logger.error(JSON.stringify(error.config));
        return error;
      });
  }

  /**
   * JWT の生成
   * JWT の形式
   * {Header BASE64 エンコード}.{JSON Claims Set BASE64 エンコード}.{signature BASE64 エンコード}
   */
  private async getJWT(clientId: string, serviceAccount: string, privateKey: string) {
    const current_time = Date.now() / 1000;
    const jws = jwt.sign(
      {
        iss: clientId,
        sub: serviceAccount,
        iat: current_time,
        exp: current_time + 60 * 60, // 1 hour
      },
      privateKey,
      { algorithm: "RS256" },
    );

    return jws;
  }
}
