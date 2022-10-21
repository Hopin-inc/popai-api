import MicrosoftRepository from '../repositories/microsoft.repository';
import { Get, Route, Controller } from 'tsoa';
import { Container } from 'typedi';

@Route('microsoft')
export default class MicrosoftController extends Controller {
  private microsoftRepo: MicrosoftRepository;
  constructor() {
    super();
    this.microsoftRepo = Container.get(MicrosoftRepository);
  }
  @Get('/')
  public async getAccessToken(): Promise<any> {
    return this.microsoftRepo.getAccessToken();
  }
}
