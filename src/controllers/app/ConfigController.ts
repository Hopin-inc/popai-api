import snakecaseKeys from "snakecase-keys";
import camelcaseKeys from "camelcase-keys";
import { Controller } from "tsoa";
import { IConfigCommon, IConfigDailyReport, IConfigNotify, IConfigProspect } from "@/types/app";
import { TimingRepository } from "@/repositories/settings/TimingRepository";
import { TimingExceptionRepository } from "@/repositories/settings/TimingExceptionRepository";
import { IsNull, MoreThanOrEqual } from "typeorm";
import dayjs from "dayjs";
import { extractArrayDifferences, formatDatetime } from "@/utils/common";
import { DailyReportConfigRepository } from "@/repositories/settings/DailyReportConfigRepository";
import { DailyReportTimingRepository } from "@/repositories/settings/DailyReportTimingRepository";
import { NotifyConfigRepository } from "@/repositories/settings/NotifyConfigRepository";
import { ProspectConfigRepository } from "@/repositories/settings/ProspectConfigRepository";
import Timing from "@/entities/settings/Timing";
import TimingException from "@/entities/settings/TimingException";
import DailyReportTiming from "@/entities/settings/DailyReportTiming";
import DailyReportConfig from "@/entities/settings/DailyReportConfig";
import { ProspectTimingRepository } from "@/repositories/settings/ProspectTimingRepository";
import ProspectConfig from "@/entities/settings/ProspectConfig";
import ProspectTiming from "@/entities/settings/ProspectTiming";

export default class ConfigController extends Controller {
  public async getCommonConfig(companyId: number): Promise<IConfigCommon | null> {
    const [timing, exceptions] = await Promise.all([
      TimingRepository.findOneBy({ company_id: companyId, section_id: IsNull() }),
      TimingExceptionRepository.findBy({
        company_id: companyId,
        section_id: IsNull(),
        date: MoreThanOrEqual(dayjs().startOf("d").toDate()),
        excluded: true,
      }),
    ]);
    const { daysOfWeek, disabledOnHolidaysJp } = camelcaseKeys(timing);
    return {
      daysOfWeek: daysOfWeek ?? [],
      disabledOnHolidaysJp,
      excludedDates: exceptions.filter(e => e.excluded).map(e => formatDatetime(e.date)),
    };
  }

  public async updateCommonConfig(
    data: Partial<IConfigCommon>,
    companyId: number,
  ): Promise<any> {
    // FIXME: excluded = falseのケースには対応していない。
    const [config, exceptions] = await Promise.all([
      TimingRepository.findOneBy({ company_id: companyId, section_id: IsNull() }),
      TimingExceptionRepository.findBy({ company_id: companyId, section_id: IsNull() }),
    ]);
    if (config) {
      const { excludedDates: _, ...sentData } = data;
      const updatedConfig: Timing = { ...config, ...snakecaseKeys(sentData, { deep: true }) };
      const storedDates = exceptions.map(e => formatDatetime(e.date, "YYYY-MM-DD"));
      const [addedDates, deletedDates] = extractArrayDifferences(data.excludedDates, storedDates);
      const addedExceptions = addedDates.map(date => new TimingException(companyId, date, true));
      const deletedExceptions = exceptions.filter(e => deletedDates.includes(formatDatetime(e.date, "YYYY-MM-DD")));
      const modifiedExceptions = exceptions
        .filter(e => ![...addedDates, ...deletedDates].includes(formatDatetime(e.date, "YYYY-MM-DD")));
      await Promise.all([
        TimingRepository.upsert(updatedConfig, []),
        TimingExceptionRepository.upsert([...addedExceptions, ...modifiedExceptions], []),
        deletedExceptions.length ? TimingExceptionRepository.softDelete(deletedExceptions.map(e => e.id)) : null,
      ]);
    } else {
      const config = new Timing(
        companyId,
        data.disabledOnHolidaysJp ?? false,
        data.daysOfWeek ?? [],
      );
      const exceptions = data.excludedDates?.map(date => new TimingException(
        companyId,
        new Date(date),
        false,
      )) ?? [];
      await Promise.all([
        TimingRepository.save(config),
        TimingExceptionRepository.upsert(exceptions, []),
      ]);
    }
  }

  public async getDailyReportConfig(companyId: number): Promise<IConfigDailyReport | null> {
    const config = await DailyReportConfigRepository.findOne({
      where: {
        company_id: companyId,
        section_id: IsNull(),
        timings: { deleted_at: IsNull() },
      },
      order: { timings: { time: "ASC" } },
      relations: ["timings"],
    });
    if (config) {
      const { enabled, chatToolId, channel, timings } = camelcaseKeys(config, { deep: true });
      return {
        enabled,
        chatToolId,
        channel,
        timings: timings.map(t => ({ time: t.time, enablePending: t.enablePending })),
      };
    }
  }

  public async updateDailyReportConfig(
    data: Partial<IConfigDailyReport>,
    companyId: number,
  ): Promise<any> {
    const config = await DailyReportConfigRepository.findOneBy({ company_id: companyId, section_id: IsNull() });
    const timings = await DailyReportTimingRepository.findBy({ config_id: config.id });
    if (config) {
      const { timings: _, ...sentConfig } = data;
      const updatedConfig: DailyReportConfig = { ...config, ...snakecaseKeys(sentConfig, { deep: true }) };
      const storedTimes = timings.map(t => t.time);
      const [addedTimes, deletedTimes] = extractArrayDifferences(data.timings?.map(t => t.time) ?? [], storedTimes);
      const addedTimings: DailyReportTiming[] = addedTimes.map(time => {
        const timing = data.timings.find(t => t.time === time);
        return new DailyReportTiming(companyId, time, timing?.enablePending);
      });
      const deletedTimings: DailyReportTiming[] = timings.filter(t => deletedTimes.includes(t.time));
      const modifiedTimings: DailyReportTiming[] = timings
        .filter(t => ![...addedTimes, ...deletedTimes].includes(t.time))
        .map(timing => ({
          ...timing,
          ...snakecaseKeys(data.timings.find(t => t.time === timing.time)),
        }));
      await Promise.all([
        DailyReportConfigRepository.upsert(updatedConfig, []),
        DailyReportTimingRepository.upsert([...addedTimings, ...modifiedTimings], []),
        deletedTimings.length ? DailyReportTimingRepository.softDelete(deletedTimings.map(e => e.id)) : null,
      ]);
    } else {
      const config = new DailyReportConfig(companyId, data.enabled ?? true, data.chatToolId, data.channel);
      const savedConfig = await DailyReportConfigRepository.save(config);
      const timings = data.timings?.map(t => new DailyReportTiming(savedConfig.id, t.time, t.enablePending)) ?? [];
      await DailyReportTimingRepository.upsert(timings, []);
    }
  }

  public async getNotifyConfig(companyId: number): Promise<IConfigNotify | null> {
    const config = await NotifyConfigRepository.findOneBy({ company_id: companyId, section_id: IsNull() });
    if (config) {
      const { enabled, chatToolId, channel } = camelcaseKeys(config);
      return { enabled, chatToolId, channel };
    }
  }

  public async updateNotifyConfig(
    data: Partial<IConfigNotify>,
    companyId: number,
  ): Promise<any> {
    const config = await NotifyConfigRepository.findOneBy({ company_id: companyId, section_id: IsNull() });
    if (config) {
      await NotifyConfigRepository.update(config.id, data);
    }
  }

  public async getProspectConfig(companyId: number): Promise<IConfigProspect | null> {
    const config = await ProspectConfigRepository.findOne({
      where: {
        company_id: companyId,
        section_id: IsNull(),
        timings: { deleted_at: IsNull() },
      },
      order: { timings: { time: "ASC" } },
      relations: ["timings"],
    });
    if (config) {
      return {
        ...camelcaseKeys(config),
        timings: config.timings?.map(timing => ({
          time: timing.time,
          askPlan: timing.ask_plan,
          askPlanMilestone: timing.ask_plan_milestone,
        })) ?? [],
      };
    }
  }

  public async updateProspectConfig(
    data: Partial<IConfigProspect>,
    companyId: number,
  ): Promise<any> {
    const config = await ProspectConfigRepository.findOneBy({ company_id: companyId, section_id: IsNull() });
    const timings = await ProspectTimingRepository.findBy({ config_id: config.id });
    if (config) {
      const { timings: _, ...sentConfig } = data;
      const updatedConfig: ProspectConfig = { ...config, ...snakecaseKeys(sentConfig) };
      const storedTimes = timings.map(t => t.time);
      const [addedTimes, deletedTimes] = extractArrayDifferences(data.timings?.map(t => t.time) ?? [], storedTimes);
      const addedTimings: ProspectTiming[] = addedTimes.map(time => {
        const timing = data.timings.find(t => t.time === time);
        return new ProspectTiming(companyId, time, timing?.askPlan, timing?.askPlanMilestone);
      });
      const deletedTimings: ProspectTiming[] = timings.filter(t => deletedTimes.includes(t.time));
      const modifiedTimings: ProspectTiming[] = timings
        .filter(t => ![...addedTimes, ...deletedTimes].includes(t.time))
        .map(timing => ({
          ...timing,
          ...snakecaseKeys(data.timings.find(t => t.time === timing.time)),
        }));
      await Promise.all([
        ProspectConfigRepository.upsert(updatedConfig, []),
        ProspectTimingRepository.upsert([...addedTimings, ...modifiedTimings], []),
        deletedTimings.length ? ProspectTimingRepository.softDelete(deletedTimings.map(e => e.id)) : null,
      ]);
    } else {
      const config = new ProspectConfig({ company: companyId, enabled: data.enabled ?? false, ...data });
      const savedConfig = await ProspectConfigRepository.save(config);
      const timings = data.timings?.map(t => {
        return new ProspectTiming(savedConfig.id, t.time, t.askPlan, t.askPlanMilestone);
      }) ?? [];
      await ProspectTimingRepository.upsert(timings, []);
    }
  }
}