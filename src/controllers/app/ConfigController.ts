import { Controller } from "tsoa";
import { IConfigCommon, IConfigProspect } from "@/types/app";
import { TimingRepository } from "@/repositories/settings/TimingRepository";
import { TimingExceptionRepository } from "@/repositories/settings/TimingExceptionRepository";
import { MoreThanOrEqual } from "typeorm";
import dayjs from "dayjs";
import { extractArrayDifferences } from "@/utils/array";
import { formatDatetime } from "@/utils/datetime";
import { ProspectConfigRepository } from "@/repositories/settings/ProspectConfigRepository";
import Timing from "@/entities/settings/Timing";
import TimingException from "@/entities/settings/TimingException";
import { ProspectTimingRepository } from "@/repositories/settings/ProspectTimingRepository";
import ProspectConfig from "@/entities/settings/ProspectConfig";
import ProspectTiming from "@/entities/settings/ProspectTiming";
import { ChatToolId } from "@/consts/common";
import SlackClient from "@/integrations/SlackClient";
import { ValueOf } from "@/types";

export default class ConfigController extends Controller {
  public async getCommonConfig(companyId: string): Promise<IConfigCommon | null> {
    const [timing, exceptions]: [Timing, TimingException[]] = await Promise.all([
      TimingRepository.findOneBy({ companyId: companyId }),
      TimingExceptionRepository.findBy({
        companyId: companyId,
        date: MoreThanOrEqual(dayjs().startOf("d").toDate()),
        excluded: true,
      }),
    ]);
    if (timing) {
      return {
        daysOfWeek: timing.daysOfWeek ?? [],
        disabledOnHolidaysJp: timing.disabledOnHolidaysJp,
        excludedDates: exceptions.filter(e => e.excluded).map(e => formatDatetime(e.date)),
      };
    }
  }

  public async updateCommonConfig(
    data: Partial<IConfigCommon>,
    companyId: string,
  ): Promise<any> {
    const { excludedDates, ...sentData } = data;
    // FIXME: excluded = falseのケースには対応していない。
    const [config, exceptions]: [Timing, TimingException[]] = await Promise.all([
      TimingRepository.findOneBy({ companyId: companyId }),
      TimingExceptionRepository.findBy({ companyId: companyId }),
    ]);
    if (config) {
      const updatedConfig: Timing = { ...config, ...sentData };
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

  public async getProspectConfig(companyId: string): Promise<IConfigProspect | null> {
    const config = await ProspectConfigRepository.findOne({
      where: { companyId: companyId },
      relations: ["timings"],
    });
    if (config) {
      const timings = config.timings?.filter(t => !t.deletedAt);
      return {
        enabled: config.enabled,
        chatToolId: config.chatToolId,
        channel: config.channel,
        from: config.from,
        fromDaysBefore: config.fromDaysBefore,
        beginOfWeek: config.beginOfWeek,
        to: config.to,
        frequency: config.frequency,
        frequencyDaysBefore: config.frequencyDaysBefore,
        timings: timings?.map((timing) => ({
          time: timing.time,
          askPlan: timing.askPlan,
          askPlanMilestone: timing.askPlanMilestone,
        })).sort((a, b) => a.time > b.time ? 1 : -1) ?? [],
      };
    }
  }

  public async updateProspectConfig(
    data: Partial<IConfigProspect>,
    companyId: string,
  ): Promise<any> {
    const { timings: sentTimings, ...sentConfig } = data;
    const config = await ProspectConfigRepository.findOneBy({ companyId: companyId });
    if (config) {
      const operations: Promise<any>[] = [];
      const timings = await ProspectTimingRepository.findBy({ configId: config.id });
      const updatedConfig: ProspectConfig = { ...config, ...sentConfig };
      operations.push(ProspectConfigRepository.upsert(updatedConfig, []));
      if (sentConfig.channel) {
        operations.push(this.joinChannel(companyId, sentConfig.chatToolId ?? config.chatToolId, sentConfig.channel));
      }
      if (sentTimings) {
        if (timings.length) {
          const storedTimes = timings.map(t => t.time);
          const [addedTimes, deletedTimes] = extractArrayDifferences(sentTimings?.map(t => t.time) ?? [], storedTimes);
          const addedTimings: ProspectTiming[] = addedTimes.map(time => {
            const timing = sentTimings.find(t => t.time === time);
            return new ProspectTiming(config.id, time, timing?.askPlan, timing?.askPlanMilestone);
          });
          const deletedTimings: ProspectTiming[] = timings.filter(t => deletedTimes.includes(t.time));
          const modifiedTimings: ProspectTiming[] = timings
            .filter(t => ![...addedTimes, ...deletedTimes].includes(t.time))
            .map(timing => ({
              ...timing,
              ...sentTimings.find(t => t.time === timing.time),
            }));
          operations.push(
            ProspectTimingRepository.upsert([...addedTimings, ...modifiedTimings], []),
            deletedTimings.length ? ProspectTimingRepository.softDelete(deletedTimings.map(e => e.id)) : null,
          );
        } else {
          operations.push(ProspectTimingRepository.save(sentTimings.map(t => {
            return new ProspectTiming(config, t.time, t.askPlan, t.askPlanMilestone);
          })));
        }
      }
      await Promise.all(operations);
    } else {
      const config = new ProspectConfig({
        company: companyId,
        enabled: data.enabled ?? false,
        chatToolId: data.chatToolId,
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

  private async joinChannel(companyId: string, chatToolId: ValueOf<typeof ChatToolId>, channel: string) {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        const slackBot = await SlackClient.init(companyId);
        return slackBot.joinChannel({ channel });
      default:
        return;
    }
  }
}
