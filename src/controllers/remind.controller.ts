import { Get, Route, Controller } from 'tsoa';
import Remindrepository from './../repositories/remind.repository';

@Route('remind')
export default class RemindController extends Controller {
  private remindRepo: Remindrepository;
  constructor() {
    super();
    this.remindRepo = new Remindrepository();
  }
  @Get('/')
  public async remindCompany(): Promise<any> {
    return this.remindRepo.remindCompany();
  }
}
