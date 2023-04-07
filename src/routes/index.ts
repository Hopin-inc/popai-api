import express from "express";

import { validationError } from "@/middleware/validate";
import integrationRouter from "@/routes/integrations";
import jobRouter from "@/routes/jobs";
import appRouter from "@/routes/app";
import { session } from "@/middleware/session";
import cors from "cors";

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

router.use(integrationRouter);
router.use(jobRouter);
router.use(appRouter);

export default router;
