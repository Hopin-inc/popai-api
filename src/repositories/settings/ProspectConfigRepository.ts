import dataSource from "@/config/data-source";
import ProspectConfig from "@/entities/settings/ProspectConfig";

export const ProspectConfigRepository = dataSource.getRepository(ProspectConfig).extend({

});