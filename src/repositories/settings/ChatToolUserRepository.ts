import dataSource from "@/config/data-source";
import ChatToolUser from "@/entities/settings/ChatToolUser";

export const ChatToolUserRepository = dataSource.getRepository(ChatToolUser).extend({

});
