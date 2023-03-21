import dataSource from "@/config/data-source";
import TimingException from "@/entities/settings/TimingException";

export const TimingExceptionRepository = dataSource.getRepository(TimingException);