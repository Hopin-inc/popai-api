import express from "express";

import { validationError } from "@/middleware/validate";
import { session } from "@/middleware/session";
import integrationRouters from "@/routes/integrations";
import jobRouters from "@/routes/jobs";
import appRouters from "@/routes/app";

const router = express();

router.use(session);
if (process.env.ENV !== "LOCAL") {
  router.set("trust proxy", 1);
}
router.use(validationError);

router.use(integrationRouters);
router.use(jobRouters);
router.use(appRouters);

export default router;
