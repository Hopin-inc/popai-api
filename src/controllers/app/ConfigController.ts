import snakecaseKeys from "snakecase-keys";
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
import { ChatToolId } from "@/consts/common";
import SlackService from "@/services/SlackService";

export default class ConfigController extends Controller {
  public async getCommonConfig(companyId: number): Promise<IConfigCommon | null> {
    const [timing, exceptions]: [Timing, TimingException[]] = await Promise.all([
      TimingRepository.findOneBy({ company_id: companyId, section_id: IsNull() }),
      TimingExceptionRepository.findBy({
        company_id: companyId,
        section_id: IsNull(),
        date: MoreThanOrEqual(dayjs().startOf("d").toDate()),
        excluded: true,
      }),
    ]);
    if (timing) {
      return {
        daysOfWeek: timing.days_of_week ?? [],
        disabledOnHolidaysJp: timing.disabled_on_holidays_jp,
        excludedDates: exceptions.filter(e => e.excluded).map(e => formatDatetime(e.date)),
      };
    }
  }

  public async updateCommonConfig(
    data: Partial<IConfigCommon>,
    companyId: number,
  ): Promise<any> {
    const { excludedDates, ...sentData } = data;
    // FIXME: excluded = falseのケースには対応していない。
    const [config, exceptions]: [Timing, TimingException[]] = await Promise.all([
      TimingRepository.findOneBy({ company_id: companyId, section_id: IsNull() }),
      TimingExceptionRepository.findBy({ company_id: companyId, section_id: IsNull() }),
    ]);
    if (config) {
      const updatedConfig: Timing = { ...config, ...snakecaseKeys(sentData, { deep: true }) };
      if (excludedDates) {
        const storedDates = exceptions.map(e => formatDatetime(e.date, "YYYY-MM-DD"));
        const [addedDates, deletedDates] = extractArrayDifferences(excludedDates, storedDates);
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
        await TimingRepository.upsert(updatedConfig, []);
      }
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
      where: { company_id: companyId, section_id: IsNull() },
      relations: ["timings"],
    });
    if (config) {
      const timings = config.timings.filter(t => !t.deleted_at);
      return {
        enabled: config.enabled,
        chatToolId: config.chat_tool_id,
        channel: config.channel,
        documentToolId: config.document_tool_id,
        database: config.database,
        timings: timings.map(t => ({ time: t.time, enablePending: t.enable_pending })),
      };
    }
  }

  public async updateDailyReportConfig(
    data: Partial<IConfigDailyReport>,
    companyId: number,
  ): Promise<any> {
    const { timings: sentTimings, ...sentConfig } = data;
    const config = await DailyReportConfigRepository.findOneBy({ company_id: companyId, section_id: IsNull() });
    if (config) {
      const operations: Promise<any>[] = [];
      const timings = await DailyReportTimingRepository.findBy({ config_id: config.id });
      const updatedConfig: DailyReportConfig = { ...config, ...snakecaseKeys(sentConfig, { deep: true }) };
      operations.push(DailyReportConfigRepository.upsert(updatedConfig, []));
      if (sentConfig.channel) {
        operations.push(this.joinChannel(companyId, sentConfig.chatToolId ?? config.chat_tool_id, sentConfig.channel));
      }
      if (sentTimings) {
        const storedTimes = timings.map(t => t.time);
        const [addedTimes, deletedTimes] = extractArrayDifferences(sentTimings?.map(t => t.time) ?? [], storedTimes);
        const addedTimings: DailyReportTiming[] = addedTimes.map(time => {
          const timing = sentTimings?.find(t => t.time === time);
          return new DailyReportTiming(companyId, time, timing?.enablePending);
        });
        const deletedTimings: DailyReportTiming[] = timings.filter(t => deletedTimes.includes(t.time));
        const modifiedTimings: DailyReportTiming[] = timings
          .filter(t => ![...addedTimes, ...deletedTimes].includes(t.time))
          .map(timing => ({
            ...timing,
            ...snakecaseKeys(sentTimings?.find(t => t.time === timing.time)),
          }));
        operations.push(
          DailyReportTimingRepository.upsert([...addedTimings, ...modifiedTimings], []),
          deletedTimings.length ? DailyReportTimingRepository.softDelete(deletedTimings.map(e => e.id)) : null,
        );
      }
      await Promise.all(operations);
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
      return {
        enabled: config.enabled,
        chatToolId: config.chat_tool_id,
        channel: config.channel,
      };
    }
  }

  public async updateNotifyConfig(
    data: Partial<IConfigNotify>,
    companyId: number,
  ): Promise<any> {
    const config = await NotifyConfigRepository.findOneBy({ company_id: companyId, section_id: IsNull() });
    const operations: Promise<any>[] = [];
    if (config) {
      operations.push(NotifyConfigRepository.update(config.id, snakecaseKeys(data, { deep: true })));
    } else {
      operations.push(NotifyConfigRepository.save(snakecaseKeys(data, { deep: true })));
    }
    if (data.channel) {
      operations.push(this.joinChannel(companyId, data.chatToolId ?? config?.chat_tool_id, data.channel));
    }
    await Promise.all(operations);
  }

  public async getProspectConfig(companyId: number): Promise<IConfigProspect | null> {
    const config = await ProspectConfigRepository.findOne({
      where: {
        company_id: companyId,
        section_id: IsNull(),
      },
      relations: ["timings"],
    });
    if (config) {
      const timings = config.timings?.filter(t => !t.deleted_at);
      return {
        enabled: config.enabled,
        chatToolId: config.chat_tool_id,
        channel: config.channel,
        from: config.from,
        fromDaysBefore: config.from_days_before,
        beginOfWeek: config.begin_of_week,
        to: config.to,
        frequency: config.frequency,
        frequencyDaysBefore: config.frequency_days_before,
        timings: timings?.map(timing => ({
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
    const { timings: sentTimings, ...sentConfig } = data;
    const config = await ProspectConfigRepository.findOneBy({ company_id: companyId, section_id: IsNull() });
    if (config) {
      const operations: Promise<any>[] = [];
      const timings = await ProspectTimingRepository.findBy({ config_id: config.id });
      const updatedConfig: ProspectConfig = { ...config, ...snakecaseKeys(sentConfig, { deep: true }) };
      operations.push(ProspectConfigRepository.upsert(updatedConfig, []));
      if (sentConfig.channel) {
        operations.push(this.joinChannel(companyId, sentConfig.chatToolId ?? config.chat_tool_id, sentConfig.channel));
      }
      if (sentTimings) {
        const storedTimes = timings.map(t => t.time);
        const [addedTimes, deletedTimes] = extractArrayDifferences(sentTimings?.map(t => t.time) ?? [], storedTimes);
        const addedTimings: ProspectTiming[] = addedTimes.map(time => {
          const timing = sentTimings.find(t => t.time === time);
          return new ProspectTiming(companyId, time, timing?.askPlan, timing?.askPlanMilestone);
        });
        const deletedTimings: ProspectTiming[] = timings.filter(t => deletedTimes.includes(t.time));
        const modifiedTimings: ProspectTiming[] = timings
          .filter(t => ![...addedTimes, ...deletedTimes].includes(t.time))
          .map(timing => ({
            ...timing,
            ...snakecaseKeys(sentTimings.find(t => t.time === timing.time)),
          }));
        operations.push(
          ProspectTimingRepository.upsert([...addedTimings, ...modifiedTimings], []),
          deletedTimings.length ? ProspectTimingRepository.softDelete(deletedTimings.map(e => e.id)) : null,
        );
      }
      await Promise.all(operations);
    } else {
      const config = new ProspectConfig({
        company: companyId,
        enabled: data.enabled ?? false,
        chatTool: data.chatToolId,
        channel: data.channel,
        from: data.from,
        fromDaysBefore: data.fromDaysBefore,
        beginOfWeek: data.beginOfWeek,
        to: data.to,
        frequency: data.frequency,
        frequencyDaysBefore: data.frequencyDaysBefore,
      });
      const savedConfig = await ProspectConfigRepository.save(config);
      const timings = sentTimings?.map(t => {
        return new ProspectTiming(savedConfig.id, t.time, t.askPlan, t.askPlanMilestone);
      }) ?? [];
      await ProspectTimingRepository.upsert(timings, []);
    }
  }

  private async joinChannel(companyId: number, chatToolId: number, channel: string) {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        const slackBot = await SlackService.init(companyId);
        return slackBot.joinChannel({ channel });
      default:
        return;
    }
  }
}