import dataSource from "@/config/data-source";
import StatusConfig from "@/entities/settings/StatusConfig";

export const StatusFeatureRepository = dataSource.getRepository(StatusConfig).extend({

});
