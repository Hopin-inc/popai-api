import express from "express";
import cors from "cors";

import { session } from "@/middleware/session";
import { validationError } from "@/middleware/validate";
import { requestLog } from "@/middleware/log";
import { allowOnlyCron } from "@/middleware/user-agent";
import integrationRouter from "@/routes/integrations";
import schedulerRouter from "@/routes/schedulers";
import appRouter from "@/routes/app";

const router = express();
router.use(session);
if (process.env.ENV !== "LOCAL") {
  router.set("trust proxy", 1);
}
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(" "),
  credentials: true,
}));

router.use(validationError);
router.use(requestLog);

router.use("/schedulers", allowOnlyCron, schedulerRouter);
router.use(integrationRouter);
router.use(appRouter);

export default router;
