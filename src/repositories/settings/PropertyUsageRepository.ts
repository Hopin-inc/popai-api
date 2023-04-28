import dataSource from "@/config/data-source";
import PropertyUsage from "@/entities/settings/PropertyUsage";

export const PropertyUsageRepository = dataSource.getRepository(PropertyUsage).extend({

});
