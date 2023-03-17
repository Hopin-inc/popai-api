import express from "express";
import lineRouter from "@/routes/integrations/line";
import slackRouter from "@/routes/integrations/slack";
import notionRouter from "@/routes/integrations/notion";

const router = express();

router.use("/line", lineRouter);
router.use("/slack", slackRouter);
router.use("/notion", notionRouter);

export default router;
