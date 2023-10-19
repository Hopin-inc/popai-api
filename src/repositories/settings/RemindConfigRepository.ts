import dataSource from "@/config/data-source";
import RemindConfig from "@/entities/settings/RemindConfig";

export const RemindConfigRepository = dataSource.getRepository(RemindConfig).extend({

});
