import express from "express";
import cors from "cors";
import { session } from "@/middleware/session";
import { authRequired } from "@/middleware/auth";
import authRouter from "@/routes/app/auth";
import accountRouter from "@/routes/app/accounts";
import chatToolRouter from "@/routes/app/chat-tool";
import todoAppRouter from "@/routes/app/todo-app";
import userRouter from "@/routes/app/users";
import configRouter from "@/routes/app/config";

const router = express();
router.use(session);
if (process.env.ENV !== "LOCAL") {
  router.set("trust proxy", 1);
}
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(" "),
  credentials: true,
}));

router.use("/auth", authRouter);
router.use("/accounts", accountRouter);
router.use("/chat-tool", authRequired, chatToolRouter);
router.use("/todo-app", authRequired, todoAppRouter);
router.use("/users", authRequired, userRouter);
router.use("/config", authRequired, configRouter);

export default router;