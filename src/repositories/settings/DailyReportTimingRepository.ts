import dataSource from "@/config/data-source";
import DailyReportTiming from "@/entities/settings/DailyReportTiming";

export const DailyReportTimingRepository = dataSource.getRepository(DailyReportTiming).extend({

});