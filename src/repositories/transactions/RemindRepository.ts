import dataSource from "@/config/data-source";
import Remind from "@/entities/transactions/Remind";

export const RemindRepository = dataSource.getRepository(Remind).extend({

});
