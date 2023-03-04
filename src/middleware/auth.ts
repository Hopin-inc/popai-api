import { NextFunction, Request, Response } from "express";

export const authRequired = (req: Request, res: Response, next: NextFunction) => {
  // TODO: Add preprocesses.
  next();
};