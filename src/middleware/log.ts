import { Request, Response, NextFunction } from "express";
import logger from "@/logger/winston";

export const requestLog = (req: Request, _res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.originalUrl}`, {
    session: req.session?.id,
    company: req.session?.company?.id,
    referrer: req.headers.referer,
  });
  next();
};
