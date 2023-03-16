import dataSource from "@/config/data-source";
import DailyReportConfig from "@/entities/settings/DailyReportConfig";

export const DailyReportConfigRepository = dataSource.getRepository(DailyReportConfig).extend({

});