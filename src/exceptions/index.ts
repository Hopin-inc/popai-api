import { StatusCodes } from "@/common/StatusCodes";

export class HttpException extends Error {
  public status?: number;
  constructor(message: string, status?: StatusCodes) {
    super(message);
    this.status = status;
  }
}
