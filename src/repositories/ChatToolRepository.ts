import dataSource from "@/config/data-source";
import ChatTool from "@/entities/masters/ChatTool";

export const ChatToolRepository = dataSource.getRepository(ChatTool).extend({});