import dataSource from "@/config/data-source";
import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";

export const CompanyTodoAppRepository = dataSource.getRepository(ImplementedTodoApp).extend({

});
