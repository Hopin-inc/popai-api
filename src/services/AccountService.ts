import { Service } from "typedi";
import Account from "@/entities/settings/Account";
import Company from "@/entities/settings/Company";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { AccountRepository } from "@/repositories/settings/AccountRepository";
import { AccountInit } from "@/types/accounts";

@Service()
export default class AuthService {
  public async register(info: AccountInit) {
    const { uid, email, name, organization } = info;
    const company = await CompanyRepository.save(new Company(organization));
    await AccountRepository.save(new Account(uid, email, name, company));
  }
}