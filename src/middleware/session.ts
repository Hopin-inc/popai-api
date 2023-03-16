import expressSession from "express-session";
import Company from "@/entities/settings/Company";
import { RequestHandler } from "express";
import AppDataSource from "@/config/data-source";
import Session from "@/entities/transactions/Session";
import { TypeormStore } from "connect-typeorm";
import * as process from "process";

declare module "express-session" {
  interface SessionData {
    uid: string;
    company: Company;
  }
}

const sessionRepository = AppDataSource.getRepository(Session);

export const session: RequestHandler = expressSession({
  secret: process.env.EXPRESS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new TypeormStore().connect(sessionRepository),
  cookie: {
    path: "/",
    secure: process.env.ENV !== "LOCAL" || process.env.NODE_HTTPS === "true",
    httpOnly: true,
    maxAge: 1000 * 60 * 30, // 30 minutes
    sameSite: process.env.ENV !== "LOCAL" ? true : "none",
  },
});