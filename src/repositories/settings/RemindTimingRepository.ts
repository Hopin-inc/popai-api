import dataSource from "@/config/data-source";
import RemindTiming from "@/entities/settings/RemindTiming";

export const RemindTimingRepository = dataSource.getRepository(RemindTiming).extend({

});
