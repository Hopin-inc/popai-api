import { Controller } from "tsoa";

import { toJapanDateTime } from "@/utils/common";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { ChatMessageRepository } from "@/repositories/transactions/ChatMessageRepository";

export default class MessageController extends Controller {
  public async handleRedirect(todoId: number, messageToken: string): Promise<string> {
    const todo = await TodoRepository.findOneBy({
      id: todoId,
    });

    if (!todo) {
      return "";
    }

    const message = await ChatMessageRepository.findOneBy({
      todo_id: todoId,
      message_token: messageToken,
    });

    if (!message) {
      return "";
    }

    // set is_replied = true
    // message.is_replied = ReplyStatus.REPLIED;
    if (!message.url_clicked_at) {
      message.url_clicked_at = toJapanDateTime(new Date());
    }

    await ChatMessageRepository.save(message);

    return todo.todoapp_reg_url;
  }
}
