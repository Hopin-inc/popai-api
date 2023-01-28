import express from "express";

import { validationError } from "@/middleware/validate";
import LineRouter from "./line";
import SlackRouter from "./slack";
import TaskRoute from "./tasks";
import MessageRoute from "./message";

const router = express();

router.use("/line", LineRouter);
router.use("/slack", SlackRouter);
router.use("/tasks", TaskRoute);
router.use("/message", MessageRoute);

router.use(validationError);

export default router;
