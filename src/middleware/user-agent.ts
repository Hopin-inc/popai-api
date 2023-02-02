import { StatusCodes } from "@/common/StatusCodes";
import { Request, Response, NextFunction } from "express";

export const allowOnlyCloudScheduler = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get("user-agent");
  console.log("userAgent", userAgent);
  if (
    process.env.ENV !== "LOCAL" &&
    !userAgent.endsWith("AppEngine-Google; (+http://code.google.com/appengine)")
  ) {
    return res.status(StatusCodes.FORBIDDEN).send("Access restricted!");
  }
  next();
};
