import { StatusCodes } from "@/common/StatusCodes";

export class HttpException {
  constructor(message, statusCode?: StatusCodes) {
    throw { status: statusCode, message: message };
  }
}
