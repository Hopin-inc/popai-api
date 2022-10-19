import { Get, Route, Controller } from 'tsoa';
interface PingResponse {
  message: string;
}

@Route('ping')
export default class PingController extends Controller {
  @Get('/')
  public async getMessage(): Promise<PingResponse> {
    return {
      message: 'pong',
    };
  }
}
