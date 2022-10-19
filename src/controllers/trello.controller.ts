import { Get, Route, Controller, Post, Body } from 'tsoa';
import { User } from './../entify/user.entity';

import { getUsers, getBoard, getCardRemind } from '../repositories/trello.repository';
import { CreateUserRequest } from '../dto/trello/create-user-trello.dto';

@Route('trello')
export default class TrelloController extends Controller {
  @Get('/')
  public async getBoard(): Promise<any> {
    return getBoard();
  }

  @Get('/card-remind')
  public async getCardRemind(): Promise<any> {
    return getCardRemind();
  }

  @Get('/user')
  public async getUsers(): Promise<Array<User>> {
    return getUsers();
  }

  @Post('/create-user')
  public async createUser(@Body() createUserDto: CreateUserRequest): Promise<any> {
    const { firstName, lastName } = createUserDto;
    return createUserDto;
  }
}
