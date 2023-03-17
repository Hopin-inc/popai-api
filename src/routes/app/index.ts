import express from "express";
import authRouter from "@/routes/app/auth";
import accountRouter from "@/routes/app/accounts";
import chatToolRouter from "@/routes/app/chat-tool";
import todoAppRouter from "@/routes/app/todo-app";
import userRouter from "@/routes/app/users";
import { authRequired } from "@/middleware/auth";

const router = express();

router.use("/auth", authRouter);
router.use("/accounts", accountRouter);
router.use("/chat-tool", authRequired, chatToolRouter);
router.use("/todo-app", authRequired, todoAppRouter);
router.use("/users", authRequired, userRouter);

export default router;