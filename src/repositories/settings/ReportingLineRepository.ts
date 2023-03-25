import dataSource from "@/config/data-source";
import ReportingLine from "@/entities/settings/ReportingLine";

export const ReportingLineRepository = dataSource.getRepository<ReportingLine>(ReportingLine).extend({

});
