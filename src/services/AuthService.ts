import { Service } from "typedi";
import { auth } from "@/libs/firebase";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import Company from "@/entities/settings/Company";
import { DecodedIdToken } from "firebase-admin/lib/auth";
import { AccountInfo } from "@/types/auth";

@Service()
export default class AuthService {
  public async register(uid: string, info: AccountInfo) {
    const { name } = info;
    await Promise.all([
      CompanyRepository.update(uid, { name }),
      await auth.updateUser(uid, { displayName: name }),
    ]);
  }

  public async verifyIdToken(authHeader: string): Promise<DecodedIdToken> {
    const chunkedAuthHeader = authHeader.split(" ");
    if (chunkedAuthHeader[0] === "Bearer") {
      const idToken = chunkedAuthHeader[1];
      return await auth.verifyIdToken(idToken);
    }
  }

  public async getAccount(id: string): Promise<Company> {
    return await CompanyRepository.findOneBy({ id });
  }
}
