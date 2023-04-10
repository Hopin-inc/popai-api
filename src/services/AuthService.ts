import { Service } from "typedi";
import { auth } from "@/libs/firebase";
import Account from "@/entities/settings/Account";
import { AccountRepository } from "@/repositories/settings/AccountRepository";
import { AccountInit } from "@/types/accounts";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import Company from "@/entities/settings/Company";
import { HttpException } from "@/exceptions";
import { StatusCodes } from "@/common/StatusCodes";
import { VerificationErrors } from "@/consts/error-messages";
import InternalSlackService from "@/services/InternalSlackService";

@Service()
export default class AuthService {
  public async register(info: AccountInit) {
    const { email, password, name, organization } = info;
    const displayName = `${ organization } / ${ name }`;
    await auth.createUser({ email, password, displayName })
      .then(async (user) => {
        await this.createAccount(user.uid, email, organization, name);
      })
      .catch((err) => {
        throw new HttpException(err.code, err.status);
      });
  }

  public async verifyEmail(email: string) {
    const account = await AccountRepository.findOneByEmail(email, false);
    if (account) {
      const { uid } = account;
      const user = await auth.getUser(uid);
      if (user && user.emailVerified) {
        const notification = new InternalSlackService();
        await Promise.all([
          AccountRepository.update(uid, { email_verified: true }),
          notification.notifyOnAccountCreated(account),
        ]);
      } else {
        throw new HttpException(VerificationErrors.EmailNotVerified, StatusCodes.FORBIDDEN);
      }
    } else {
      throw new HttpException(VerificationErrors.NoMatchedAccount, StatusCodes.BAD_REQUEST);
    }
  }

  private async createAccount(uid: string, email: string, organization: string, name: string): Promise<Account> {
    const company = await CompanyRepository.save(new Company(organization));
    return await AccountRepository.save(new Account(uid, email, name, company));
  }

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