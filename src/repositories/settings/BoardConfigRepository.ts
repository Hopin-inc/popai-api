import dataSource from "@/config/data-source";
import BoardConfig from "@/entities/settings/BoardConfig";

export const BoardConfigRepository = dataSource.getRepository(BoardConfig).extend({

});