import dataSource from "@/config/data-source";
import Prospect from "@/entities/transactions/Prospect";

export const ProspectRepository = dataSource.getRepository<Prospect>(Prospect).extend({

});
