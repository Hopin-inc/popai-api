import dataSource from "@/config/data-source";
import NotifyConfig from "@/entities/settings/NotifyConfig";

export const NotifyConfigRepository = dataSource.getRepository(NotifyConfig);