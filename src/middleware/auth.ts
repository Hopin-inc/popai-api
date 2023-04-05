import { NextFunction, Request, Response } from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import dayjs from "dayjs";
import { SessionErrors } from "@/consts/error-messages";

export const authRequired = (req: Request, res: Response, next: NextFunction) => {
  const { cookie, uid } = req.session;
  if (!cookie.expires || !dayjs(cookie.expires).isAfter(dayjs())) {
    ApiResponse.errRes(res, SessionErrors.Expired, StatusCodes.UNAUTHORIZED);
  } else if (!uid) {
    ApiResponse.errRes(res, SessionErrors.NotLoggedIn, StatusCodes.UNAUTHORIZED);
  } else {
    next();
  }
};