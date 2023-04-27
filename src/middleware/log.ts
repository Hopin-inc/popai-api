import { Request, Response, NextFunction } from "express";
import logger from "@/libs/logger";
import { getMemoryUsage } from "@/utils/process";

export const requestLog = (req: Request, _res: Response, next: NextFunction) => {
  logger.debug(`${ req.method } ${ req.originalUrl }`, {
    session: req.session?.id,
    company: req.session?.company?.id,
    account: req.session?.uid,
    referrer: req.headers.referer,
    memory: getMemoryUsage(),
  });
  next();
};
