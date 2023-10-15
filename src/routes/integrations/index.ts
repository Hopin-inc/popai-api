import express from "express";
import slackRouter from "@/routes/integrations/slack";
import notionRouter from "@/routes/integrations/notion";
import backlogRouter from "@/routes/integrations/backlog";
import lineWorksRouter from "@/routes/integrations/line-works";
import { authRequired } from "@/middleware/auth";

const router = express();

router.use("/slack", slackRouter);
router.use("/notion", notionRouter);
router.use("/backlog", backlogRouter);
router.use("/line-works", authRequired, lineWorksRouter);

export default router;
