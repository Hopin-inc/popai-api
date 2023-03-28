import { Service } from "typedi";
import { auth } from "@/libs/firebase";
import Account from "@/entities/settings/Account";
import { AccountRepository } from "@/repositories/settings/AccountRepository";

@Service()
export default class AuthService {
  public async verifyIdToken(authHeader: string): Promise<string> {
    const chunkedAuthHeader = authHeader.split(" ");
    if (chunkedAuthHeader[0] === "Bearer") {
      const idToken = chunkedAuthHeader[1];
      const decodedToken = await auth.verifyIdToken(idToken);
      const { uid } = decodedToken;
      return uid;
    }
  }

  public async getAccount(uid: string): Promise<Account> {
    return await AccountRepository.findOne({
      where: { uid },
      relations: ["company"],
    });
  }
}