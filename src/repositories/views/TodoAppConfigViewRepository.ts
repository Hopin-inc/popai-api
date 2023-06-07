import dataSource from "@/config/data-source";
import TodoAppConfigView from "@/entities/views/TodoAppConfigView";

export const TodoAppConfigViewRepository = dataSource.getRepository(TodoAppConfigView).extend({

});
