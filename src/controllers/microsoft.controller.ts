import MicrosoftRepository from '../repositories/microsoft.repository';
import { Get, Route, Controller } from 'tsoa';

@Route('microsoft')
export default class MicrosoftController extends Controller {
  private microsoftRepo: MicrosoftRepository;
  constructor() {
    super();
    this.microsoftRepo = new MicrosoftRepository();
  }
  @Get('/')
  public async getAccessToken(): Promise<any> {
    return this.microsoftRepo.getAccessToken();
  }
}
