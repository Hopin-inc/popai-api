import { NextFunction, Request, Response } from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import dayjs from "dayjs";

export const authRequired = (req: Request, res: Response, next: NextFunction) => {
  const { cookie, uid } = req.session;
  if (!cookie.expires || !dayjs(cookie.expires).isAfter(dayjs())) {
    ApiResponse.errRes(res, "Session expired.", StatusCodes.UNAUTHORIZED);
  } else if (!uid) {
    ApiResponse.errRes(res, "No account found.", StatusCodes.UNAUTHORIZED);
  } else {
    next();
  }
};