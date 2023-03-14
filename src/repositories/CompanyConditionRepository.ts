import dataSource from "@/config/data-source";
import { CompanyCondion } from "../../dist/entify/company.conditon.entity";
import CompanyCondition from "@/entities/settings/CompanyCondition";

export const CompanyConditionRepository = dataSource.getRepository(CompanyCondion).extend({
  async getDayReminds(companyConditions: CompanyCondition[]): Promise<number[]> {
    return companyConditions
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);
  },
});