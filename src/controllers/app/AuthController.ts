import { Controller } from "tsoa";
import AuthService from "@/services/AuthService";
import { Container } from "typedi";
import { DecodedIdToken } from "firebase-admin/lib/auth";
import Company from "@/entities/settings/Company";
import { AccountInfo } from "@/types/auth";

export default class AuthController extends Controller {
  private readonly authService: AuthService;

  constructor() {
    super();
    this.authService = Container.get(AuthService);
  }

  public async signUp(uid: string, info: AccountInfo): Promise<Company> {
    return await this.authService.register(uid, info);
  }

  public async login(authHeader: string): Promise<[Company, DecodedIdToken]> {
    const idToken = await this.authService.verifyIdToken(authHeader);
    return [await this.authService.getAccount(idToken.uid), idToken];
  }

  public async fetchLoginState(uid: string): Promise<Company> {
    return await this.authService.getAccount(uid);
  }
}
