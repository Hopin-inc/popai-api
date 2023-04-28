import { NextFunction, Request, Response } from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import dayjs from "dayjs";
import { AccountErrors, SessionErrors } from "@/consts/error-messages";

export const authRequired = (req: Request, res: Response, next: NextFunction) => {
  const { cookie, registered } = req.session;
  if (!cookie.expires || !dayjs(cookie.expires).isAfter(dayjs())) {
    ApiResponse.errRes(res, SessionErrors.Expired, StatusCodes.UNAUTHORIZED);
  } else if (!registered) {
    ApiResponse.errRes(res, AccountErrors.NotRegistered, StatusCodes.UNAUTHORIZED);
  } else {
    next();
  }
};
