import express from "express";

import MessageController from "@/controllers/MessageController";
import { StatusCodes } from "@/common/StatusCodes";

const router = express();

router.get("/redirect/:todoId/:messageToken", async function(req, res) {
  console.log(req.params);

  const todoId: number = +req.params.todoId;
  const messageToken = req.params.messageToken;

  const messageController = new MessageController();
  const url = await messageController.handleRedirect(todoId, messageToken);

  if (!url) {
    return res.status(StatusCodes.NOT_FOUND).send("Not found!");
  }
  return res.redirect(url);
});

export default router;
