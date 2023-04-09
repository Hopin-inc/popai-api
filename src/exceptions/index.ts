import { StatusCodes } from "@/common/StatusCodes";

export class HttpException extends Error {
  public status?: number;
