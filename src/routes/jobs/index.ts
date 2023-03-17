import express from "express";
import { allowOnlyCloudScheduler } from "@/middleware/user-agent";
import taskRoute from "@/routes/jobs/tasks";
import messageRoute from "@/routes/jobs/message";

const router = express();
router.use("/tasks", allowOnlyCloudScheduler, taskRoute);
router.use("/message", messageRoute);

export default router;