import { Controller } from "tsoa";
import AuthService from "@/services/AuthService";
import { Container } from "typedi";
import Account from "@/entities/settings/Account";
import { AccountInit } from "@/types/accounts";

export default class AuthController extends Controller {
  private readonly authService: AuthService;

  constructor() {
    super();
    this.authService = Container.get(AuthService);
  }

  public async signUp(info: AccountInit): Promise<void> {
    await this.authService.register(info);
  }

  public async verifyEmail(email: string): Promise<void> {
    await this.authService.verifyEmail(email);
  }

  public async login(authHeader: string): Promise<Account> {
    const uid = await this.authService.verifyIdToken(authHeader);
    return await this.authService.getAccount(uid);
  }

  public async fetchLoginState(uid: string): Promise<Account> {
    return await this.authService.getAccount(uid);
  }
}