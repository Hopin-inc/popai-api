import express from "express";
import session from "express-session";

import { validationError } from "@/middleware/validate";
import { allowOnlyCloudScheduler } from "@/middleware/user-agent";
import AuthRouter from "./auth";
import AccountRouter from "./accounts";
import LineRouter from "./line";
import SlackRouter from "./slack";
import TaskRoute from "./tasks";
import MessageRoute from "./message";
import Company from "@/entities/settings/Company";
import * as process from "process";

declare module "express-session" {
  interface SessionData {
    uid: string;
    company: Company;
  }
}

const router = express();

router.use(session({
  secret: process.env.EXPRESS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // rolling: true,
  cookie: {
    path: "/",
    secure: process.env.ENV !== "LOCAL",
    httpOnly: true,
    maxAge: 1000 * 60 * 30,
    sameSite: process.env.ENV !== "LOCAL",
  },
}));
if (process.env.ENV !== "LOCAL") {
  router.set("trust proxy", 1);
}

router.use("/auth", AuthRouter);
router.use("/accounts", AccountRouter);


router.use("/line", LineRouter);
router.use("/slack", SlackRouter);
router.use("/tasks", allowOnlyCloudScheduler, TaskRoute);
router.use("/message", MessageRoute);
router.use(validationError);

export default router;
