import dataSource from "@/config/data-source";
import Timing from "@/entities/settings/Timing";

export const TimingRepository = dataSource.getRepository(Timing);