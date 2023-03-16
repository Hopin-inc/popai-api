import dataSource from "@/config/data-source";
import ChatMessage from "@/entities/transactions/ChatMessage";

export const ChatMessageRepository = dataSource.getRepository(ChatMessage).extend({});