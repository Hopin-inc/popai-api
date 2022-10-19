import { IsString, MinLength } from 'class-validator';

export class CreateUserRequest {
  @IsString()
  @MinLength(5, { message: 'FirstName should be minimum of 5 characters' })
  public firstName?: string;

  @IsString()
  @MinLength(5, { message: 'LastName should be minimum of 5 characters' })
  public lastName?: string;
}
