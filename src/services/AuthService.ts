import { Service } from "typedi";
import { Repository } from "typeorm";
import { auth } from "@/libs/firebase";
import AppDataSource from "@/config/data-source";
import Account from "@/entities/settings/Account";

@Service()
export default class AuthService {
  private readonly accountRepository: Repository<Account>;

  constructor() {
    this.accountRepository = AppDataSource.getRepository(Account);
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
    return await this.accountRepository.findOne({
      where: { uid },
      relations: ["company"],
    });
  }
}