import express from "express";
import { allowOnlyCron } from "@/middleware/user-agent";
import taskRoute from "@/routes/jobs/tasks";
import messageRoute from "@/routes/jobs/message";

const router = express();
router.use("/tasks", allowOnlyCron, taskRoute);
router.use("/message", messageRoute);

export default router;