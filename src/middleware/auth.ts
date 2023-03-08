import { NextFunction, Request, Response } from "express";
import ApiResponse from "@/common/ApiResponse";
import { StatusCodes } from "@/common/StatusCodes";
import dayjs from "dayjs";

export const authRequired = (req: Request, res: Response, next: NextFunction) => {
  const { cookie, uid } = req.session;
  if (!cookie.expires || !dayjs(cookie.expires).isAfter(dayjs()) || !uid) {
    ApiResponse.errRes(res, "Login required.", StatusCodes.UNAUTHORIZED);
  } else {
    next();
  }
};