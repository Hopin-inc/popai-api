import { Controller } from "tsoa";
import AuthService from "@/services/AuthService";
import { Container } from "typedi";
import Account from "@/entities/settings/Account";


export default class AuthController extends Controller {
  private readonly authService: AuthService;

  constructor() {
    super();
    this.authService = Container.get(AuthService);
  }

  public async login(authHeader: string): Promise<Account> {
    const uid = await this.authService.verifyIdToken(authHeader);
    return await this.authService.getAccount(uid);
  }w;

  public async fetchLoginState(uid: string): Promise<Account> {
    return await this.authService.getAccount(uid);
  }
}