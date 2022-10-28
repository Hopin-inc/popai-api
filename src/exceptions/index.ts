import { StatusCodes } from './../common/status-codes';

export class HttpException {
  constructor(message, statusCode?: StatusCodes) {
    throw { status: statusCode, message: message };
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized') {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message: string = 'Internal Server Error') {
    super(message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

export class LoggerError extends Error {
  constructor(message: string) {
    super(message);
  }
}
