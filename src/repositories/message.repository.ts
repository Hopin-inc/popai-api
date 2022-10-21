import { AppDataSource } from '../config/data-source';
import { fetchTrelloApi } from '../libs/request';
import { InternalServerErrorException } from '../exceptions';
import {
  EventMessage,
  FlexMessage,
  ImageMessage,
  Message,
  StickerMessage,
  TextMessage,
} from '@line/bot-sdk';
import { ChatMessage } from '../entify/message.entity';
import { MessageType } from '../entify/message_type.entity';

export const createMessage = async (lineMessage: EventMessage): Promise<ChatMessage> => {
  try {
    const messageRepository = AppDataSource.getRepository(ChatMessage);
    const messageTypeRepository = AppDataSource.getRepository(MessageType);

    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = 1;
    chatMessage.chattool_id = 1;
    chatMessage.is_openned = 1;
    chatMessage.is_replied = 1;
    chatMessage.message_trigger_id = 2; // reply
    // chatMessage.todo_id = 1;

    switch (lineMessage.type) {
      case 'text':
        chatMessage.body = (lineMessage as TextMessage).text;
        chatMessage.message_type_id = 1;
        break;

      case 'sticker':
        chatMessage.body = (lineMessage as StickerMessage).stickerId;
        chatMessage.message_type_id = 2;
        break;
    }

    return await messageRepository.save(chatMessage);
  } catch (error) {
    throw new InternalServerErrorException(error.message);
  }
};
