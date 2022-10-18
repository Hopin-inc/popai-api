import { getAccessToken } from '../repositories/microsoft.repository';
import { Get, Route, Controller } from 'tsoa';

@Route('microsoft')
export default class MicrosoftController extends Controller {
  @Get('/')
  public async getAccessToken(): Promise<any> {
    return getAccessToken();
  }
}
