import { Service } from "typedi";
import { auth } from "@/libs/firebase";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import Company from "@/entities/settings/Company";
import { DecodedIdToken } from "firebase-admin/lib/auth";
import { AccountInfo } from "@/types/auth";

@Service()
export default class AuthService {
  public async register(uid: string, info: AccountInfo): Promise<Company> {
    const { name } = info;
    await Promise.all([
      CompanyRepository.update(uid, { name }),
      auth.updateUser(uid, { displayName: name }),
    ]);
    return await CompanyRepository.findOneBy({ id: uid });
  }

  public async registerEmail(uid: string, name: string): Promise<Company> {
    await Promise.all([
      CompanyRepository.save(new Company(uid, name)),
      auth.updateUser(uid, { displayName: name }),
    ]);
    return await CompanyRepository.findOneBy({ id: uid });
  }

  public async verifyIdToken(authHeader: string): Promise<DecodedIdToken> {
    const chunkedAuthHeader = authHeader.split(" ");
    if (chunkedAuthHeader[0] === "Bearer" && chunkedAuthHeader.length >= 2) {
      const idToken = chunkedAuthHeader[1];
      return await auth.verifyIdToken(idToken);
    }
  }

  public async getAccount(id: string): Promise<Company> {
    return await CompanyRepository.findOne({
      where: { id },
      relations: ["implementedChatTool"],
    });
  }

  public async getCompany(id: string): Promise<Company> {
    return await CompanyRepository.findOne({
      where: { id },
    });
  }
}
