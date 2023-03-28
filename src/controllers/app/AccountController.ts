import { Controller } from "tsoa";
import AccountService from "@/services/AccountService";
import { Container } from "typedi";
import { AccountInit } from "@/types/accounts";


export default class AccountController extends Controller {
  private readonly accountService: AccountService;

  constructor() {
    super();
    this.accountService = Container.get(AccountService);
  }

  public async signUp(info: AccountInit): Promise<any> {
    return await this.accountService.register(info);
  }
}