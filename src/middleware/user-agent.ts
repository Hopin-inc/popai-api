import { StatusCodes } from "@/common/StatusCodes";
import { Request, Response, NextFunction } from "express";

export const allowOnlyCron = (req: Request, res: Response, next: NextFunction) => {
  const isCron = !!req.headers["X-Appengine-Cron"];
  if (!isCron) {
    return res.status(StatusCodes.FORBIDDEN).send("Access restricted!");
  }
  next();
};
