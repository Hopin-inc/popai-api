import { Response } from "express";
import { StatusCodes } from "./statusCodes";

export class ResponseApi {
  /**
   * Send success response
   * @param res
   * @param data
   * @param status
   * @param message
   * @returns
   */
  static successRes(
    res: Response,
    data: object,
    status: number = StatusCodes.OK,
    message: string = ""
  ) {
    return res.status(status).json({ status, data, message });
  }

  /**
   * Send error response
   *
   * @param res
   * @param message
   * @param status
   * @returns
   */
  static errRes(
    res: Response,
    message = "Sever Error",
    status = StatusCodes.INTERNAL_SERVER_ERROR
  ) {
    return res.status(status).json({
      status,
      message,
    });
  }
}
