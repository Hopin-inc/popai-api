import dataSource from "@/config/data-source";
import ImplementedChatTool from "@/entities/settings/ImplementedChatTool";

export const ImplementedChatToolRepository = dataSource.getRepository<ImplementedChatTool>(ImplementedChatTool).extend({

});
