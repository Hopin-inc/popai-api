import dataSource from "@/config/data-source";
import SetupFeature from "@/entities/settings/SetupFeature";

export const SetupFeatureRepository = dataSource.getRepository(SetupFeature).extend({

});