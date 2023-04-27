import express from "express";
import slackRouter from "@/routes/integrations/slack";
import notionRouter from "@/routes/integrations/notion";

const router = express();

router.use("/slack", slackRouter);
router.use("/notion", notionRouter);

export default router;
