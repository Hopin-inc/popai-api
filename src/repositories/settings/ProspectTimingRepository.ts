import dataSource from "@/config/data-source";
import ProspectTiming from "@/entities/settings/ProspectTiming";

export const ProspectTimingRepository = dataSource.getRepository<ProspectTiming>(ProspectTiming).extend({

});
