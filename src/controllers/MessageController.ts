import { Controller } from "tsoa";
import { Repository } from "typeorm";

import ChatMessage from "@/entities/transactions/ChatMessage";
import Todo from "@/entities/transactions/Todo";

import AppDataSource from "@/config/data-source";
import { toJapanDateTime } from "@/utils/common";
import { TodoRepository } from "@/repositories/TodoRepository";

export default class MessageController extends Controller {
  private messageRepository: Repository<ChatMessage>;

  constructor() {
    super();
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
  }

  public async handleRedirect(todoId: number, messageToken: string): Promise<string> {
    const todo = await TodoRepository.findOneBy({
      id: todoId,
    });

    if (!todo) {
      return "";
    }

    const message = await this.messageRepository.findOneBy({
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

    await this.messageRepository.save(message);

    return todo.todoapp_reg_url;
  }
}
