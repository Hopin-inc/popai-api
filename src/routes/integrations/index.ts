import express from "express";
import slackRouter from "@/routes/integrations/slack";
import notionRouter from "@/routes/integrations/notion";
import backlogRouter from "@/routes/integrations/backlog";

const router = express();

router.use("/slack", slackRouter);
router.use("/notion", notionRouter);
router.use("/backlog", backlogRouter);

export default router;
