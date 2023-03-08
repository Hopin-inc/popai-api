import { Service } from "typedi";
import { Repository } from "typeorm";
import AppDataSource from "@/config/data-source";
import Account from "@/entities/settings/Account";
import { AccountInit } from "@/types/accounts";
import Company from "@/entities/settings/Company";

@Service()
export default class AuthService {
  private readonly accountRepository: Repository<Account>;
  private readonly companyRepository: Repository<Company>;

  constructor() {
    this.accountRepository = AppDataSource.getRepository(Account);
    this.companyRepository = AppDataSource.getRepository(Company);
  }

  public async register(info: AccountInit) {
    const { uid, email, name, organization } = info;
    const company = await this.companyRepository.save(new Company(organization));
    await this.accountRepository.save(new Account(uid, email, name, company));
  }
}