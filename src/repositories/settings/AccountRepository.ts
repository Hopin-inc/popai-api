import dataSource from "@/config/data-source";
import Account from "@/entities/settings/Account";

export const AccountRepository = dataSource.getRepository(Account).extend({});