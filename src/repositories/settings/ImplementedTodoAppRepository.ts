import dataSource from "@/config/data-source";
import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";

export const ImplementedTodoAppRepository = dataSource.getRepository(ImplementedTodoApp).extend({

});
