import { Route, Controller, Post, Body } from 'tsoa';

import TrelloRepository from '../repositories/trello.repository';
import { CreateUserRequest } from '../dto/trello/create-user-trello.dto';

@Route('trello')
export default class TrelloController extends Controller {
  private trelloRepo: TrelloRepository;
  constructor() {
    super();
    this.trelloRepo = new TrelloRepository();
  }

  @Post('/create-user')
  public async createUser(@Body() createUserDto: CreateUserRequest): Promise<any> {
    return createUserDto;
  }
}
