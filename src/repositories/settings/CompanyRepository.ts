import dataSource from "@/config/data-source";
import Company from "@/entities/settings/Company";

export const CompanyRepository = dataSource.getRepository(Company).extend({});