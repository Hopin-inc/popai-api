import dataSource from "@/config/data-source";
import RemindConfigView from "@/entities/views/RemindConfigView";

export const RemindConfigViewRepository = dataSource.getRepository(RemindConfigView).extend({

});
