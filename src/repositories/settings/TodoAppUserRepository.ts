import dataSource from "@/config/data-source";
import TodoAppUser from "@/entities/settings/TodoAppUser";

export const TodoAppUserRepository = dataSource.getRepository(TodoAppUser).extend({
});