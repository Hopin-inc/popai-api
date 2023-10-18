import dataSource from "@/config/data-source";
import SetupConfig from "@/entities/settings/SetupConfig";

export const SetupConfigRepository = dataSource.getRepository(SetupConfig).extend({

});
