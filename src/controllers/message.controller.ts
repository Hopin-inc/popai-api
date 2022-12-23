import { ChatMessage } from "../entify/message.entity";
import { Todo } from "../entify/todo.entity";
import { Get, Controller } from "tsoa";
import { Repository } from "typeorm";
import { AppDataSource } from "../config/dataSource";
import { toJapanDateTime } from "../utils/common";

export default class MessageController extends Controller {
  private messageRepository: Repository<ChatMessage>;
  private todoRepository: Repository<Todo>;

  constructor() {
    super();
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  @Get("/")
  public async handleRedirect(todoId: number, messageToken: string): Promise<string> {
    const todo = await this.todoRepository.findOneBy({
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
