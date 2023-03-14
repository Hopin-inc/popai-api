import dataSource from "@/config/data-source";
import RemindUserJob from "@/entities/transactions/RemindUserJob";

export const RemindUserJobRepository = dataSource.getRepository(RemindUserJob).extend({});