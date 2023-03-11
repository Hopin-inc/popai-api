import express from "express";

import { validationError } from "@/middleware/validate";
import { allowOnlyCloudScheduler } from "@/middleware/user-agent";
import AuthRouter from "./auth";
import AccountRouter from "./accounts";
import LineRouter from "./line";
import SlackRouter from "./slack";
import TaskRoute from "./tasks";
import MessageRoute from "./message";
import { session } from "@/middleware/session";

const router = express();
router.use(session);
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
