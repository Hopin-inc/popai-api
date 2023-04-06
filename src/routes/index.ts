import express from "express";

import { validationError } from "@/middleware/validate";
import integrationRouter from "@/routes/integrations";
import jobRouter from "@/routes/jobs";
import appRouter from "@/routes/app";

const router = express();

router.use(validationError);

router.use(integrationRouter);
router.use(jobRouter);
router.use(appRouter);

export default router;
