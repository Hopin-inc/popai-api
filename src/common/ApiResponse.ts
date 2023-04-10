import { Response } from "express";

import { StatusCodes } from "@/common/StatusCodes";

export default class ApiResponse {
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
    data: any,
    status: number = StatusCodes.OK,
    message: string = "",
  ) {
    return res.status(status).json({ status, data, message });
  }

  static successRawRes(res: Response, data?: object, status: number = StatusCodes.OK) {
    return res.status(status).json(data);
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
    status = StatusCodes.INTERNAL_SERVER_ERROR,
  ) {
    return res.status(status).json({
      status,
      message,
    });
  }
}
