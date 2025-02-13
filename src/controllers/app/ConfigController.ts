import { Controller } from "tsoa";
import { IConfigSetup, ISetupFeatureId } from "@/types/setup";
import { IConfigCommon, IConfigFeatures, IConfigProspect, IConfigRemind, IConfigStatus } from "@/types/app";
import { TimingRepository } from "@/repositories/settings/TimingRepository";
import { TimingExceptionRepository } from "@/repositories/settings/TimingExceptionRepository";
import { In, MoreThanOrEqual } from "typeorm";
import dayjs from "dayjs";
import { extractArrayDifferences } from "@/utils/array";
import { formatDatetime } from "@/utils/datetime";
import { ProspectConfigRepository } from "@/repositories/settings/ProspectConfigRepository";
import Timing from "@/entities/settings/Timing";
import TimingException from "@/entities/settings/TimingException";
import { ProspectTimingRepository } from "@/repositories/settings/ProspectTimingRepository";
import ProspectConfig from "@/entities/settings/ProspectConfig";
import ProspectTiming from "@/entities/settings/ProspectTiming";
import SetupFeature from "@/entities/settings/SetupFeature";
import { AskType, ChatToolId } from "@/consts/common";
import SlackClient from "@/integrations/SlackClient";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { SetupConfigRepository } from "@/repositories/settings/SetupConfigRepository";
import { SetupFeatureRepository } from "@/repositories/settings/SetupFeatureRepository";
import { UserConfigViewRepository } from "@/repositories/views/UserConfigViewRepository";
import { TodoAppConfigViewRepository } from "@/repositories/views/TodoAppConfigViewRepository";
import { ProspectConfigViewRepository } from "@/repositories/views/ProspectConfigViewRepository";
import { RemindConfigRepository } from "@/repositories/settings/RemindConfigRepository";
import RemindConfig from "@/entities/settings/RemindConfig";
import RemindTiming from "@/entities/settings/RemindTiming";
import { RemindTimingRepository } from "@/repositories/settings/RemindTimingRepository";

export default class ConfigController extends Controller {
  public async getConfigStatus(companyId: string): Promise<IConfigStatus> {
    const company = await CompanyRepository.findOne({
      where: { id: companyId },
      relations: ["boards", "prospectConfigs"],
    });
    const [userConfig, todoAppConfigs, prospectConfigs] = await Promise.all([
      UserConfigViewRepository.findOneBy({ companyId }),
      TodoAppConfigViewRepository.findBy({
        boardId: In(company.boards.map(b => b.id)),
      }),
      ProspectConfigViewRepository.findBy({
        configId: In(company.prospectConfigs.map(c => c.id)),
      }),
    ]);
    const projectsConfig = prospectConfigs.find(c => c.type === AskType.PROJECTS);
    const todosConfig = prospectConfigs.find(c => c.type === AskType.TODOS);
    return {
      users: userConfig.isValid,
      todoApp: !todoAppConfigs.some(c => !c.isValid),
      projects: {
        enabled: projectsConfig?.enabled ?? false,
        isValid: projectsConfig?.isValid ?? false,
      },
      todos: {
        enabled: todosConfig?.enabled ?? false,
        isValid: todosConfig?.isValid ?? false,
      },
    };
  }

  public async getCommonConfig(companyId: string): Promise<IConfigCommon | null> {
    const [timing, exceptions]: [Timing, TimingException[]] = await Promise.all([
      TimingRepository.findOneBy({ companyId }),
      TimingExceptionRepository.findBy({
        companyId,
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
      TimingRepository.findOneBy({ companyId }),
      TimingExceptionRepository.findBy({ companyId }),
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

  public async getFeatures(companyId: string): Promise<IConfigFeatures> {
    const prospectConfigs = await ProspectConfigRepository.findBy({ companyId });
    return {
      projects: prospectConfigs?.some(c => c.type === AskType.PROJECTS && c.enabled) ?? false,
      todos: prospectConfigs?.some(c => c.type === AskType.TODOS && c.enabled) ?? false,
    };
  }

  public async getProspectConfig(companyId: string, type: number): Promise<IConfigProspect> {
    const config = await ProspectConfigRepository.findOne({
      where: { companyId, type },
      relations: ["timings"],
    });
    if (config) {
      const timings = config.timings?.filter(t => !t.deletedAt);
      return {
        type: config.type,
        enabled: config.enabled,
        chatToolId: config.chatToolId,
        channel: config.channel,
        from: config.from,
        fromDaysBefore: config.fromDaysBefore,
        beginOfWeek: config.beginOfWeek,
        to: config.to,
        frequency: config.frequency,
        frequencyDaysBefore: config.frequencyDaysBefore,
        timings: timings?.map(timing => ({
          time: timing.time,
          mode: timing.mode,
        })).sort((a, b) => a.time > b.time ? 1 : -1) ?? [],
      };
    }
  }

  public async updateProspectConfig(
    data: Partial<IConfigProspect>,
    companyId: string,
  ): Promise<any> {
    const type = data.type;
    const { timings: sentTimings, ...sentConfig } = data;
    const config = await ProspectConfigRepository.findOneBy({ companyId, type });
    if (config) {
      const operations: Promise<any>[] = [];
      const updatedConfig: ProspectConfig = { ...config, ...sentConfig };
      operations.push(ProspectConfigRepository.upsert(updatedConfig, []));
      if (sentConfig.channel) {
        operations.push(this.joinChannel(companyId, sentConfig.chatToolId ?? config.chatToolId, sentConfig.channel));
      }
      if (sentTimings) {
        const timings = await ProspectTimingRepository.findBy({ configId: config.id });
        if (timings.length) {
          const storedTimes = timings.map(t => t.time);
          const [addedTimes, deletedTimes] = extractArrayDifferences(sentTimings?.map(t => t.time) ?? [], storedTimes);
          const addedTimings: ProspectTiming[] = addedTimes.map(time => {
            const timing = sentTimings.find(t => t.time === time);
            return new ProspectTiming({
              config,
              time,
              mode: timing?.mode,
            });
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
            return new ProspectTiming({
              config,
              time: t.time,
              mode: t.mode,
            });
          })));
        }
      }
      await Promise.all(operations);
    } else {
      const config = new ProspectConfig({
        company: companyId,
        type: data.type,
        enabled: data.enabled,
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
        return new ProspectTiming({
          config: savedConfig,
          time: t.time,
          mode: t.mode,
        });
      }) ?? [];
      await ProspectTimingRepository.upsert(timings, []);
    }
  }

  private async joinChannel(companyId: string, chatToolId: number, channel: string) {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        const slackBot = await SlackClient.init(companyId);
        try {
          return slackBot.joinChannel({ channel });
        } catch (_) {
          return;
        }
      default:
        return;
    }
  }

  public async getSetupConfig(companyId: string): Promise<IConfigSetup> {
    const setupConfig = await SetupConfigRepository.findOne({
      where: { companyId: companyId },
      relations: ["features"],
    });
    if (!setupConfig) {
      const newConfig = await SetupConfigRepository.save({
        companyId,
        currentStep: null,
        setupTodoAppId: null,
        setupChatToolId: null,
        features: [],
      });
      return {
        currentStep: newConfig.currentStep,
        setupTodoAppId: newConfig.setupTodoAppId,
        setupChatToolId: newConfig.setupChatToolId,
        setupFeatures: newConfig.features.map(f => f.feature as ISetupFeatureId),
      };
    } else {
      return {
        currentStep: setupConfig.currentStep,
        setupTodoAppId: setupConfig.setupTodoAppId,
        setupChatToolId: setupConfig.setupChatToolId,
        setupFeatures: setupConfig.features.map(f => f.feature as ISetupFeatureId),
      };
    }
  }

  public async updateSetupConfig(
    data: Partial<IConfigSetup>,
    companyId: string,
  ): Promise<any> {
    const { setupFeatures, ...restData } = data;
    const setupConfig = await SetupConfigRepository.findOne({
      where: { companyId: companyId },
      relations: ["features"],
    });
    if (setupConfig) {
      if(Object.keys(restData).length !== 0) {
        await SetupConfigRepository.update(
          setupConfig.id, 
          {
            ...restData,
          },
        );
      }

      if (setupFeatures !== undefined) {
        const oldFeature = await SetupFeatureRepository.findBy({ configId: setupConfig.id });
        await SetupFeatureRepository.remove(oldFeature);
        await Promise.all(
          setupFeatures.map(f => { 
            return SetupFeatureRepository.save(
              new SetupFeature({
                config: setupConfig.id, 
                feature: f,
              }),
            );
          }),
        );
      }
    }
    else {
      await SetupConfigRepository.save({
        companyId,
        ...data,
      });
    }
  }

  public async getRemindConfig(companyId: string, type: number): Promise<IConfigRemind> {
    const config = await RemindConfigRepository.findOne({
      where: { companyId, type },
      relations: ["timings"],
    });
    if (config) {
      const timings = config.timings?.filter(t => !t.deletedAt);
      return {
        type: config.type,
        enabled: config.enabled,
        chatToolId: config.chatToolId,
        channel: config.channel,
        frequency: config.frequency,
        limit: config.limit,
        reportAfterRecovery: config.reportAfterRecovery,
        timings: timings?.map(timing => ({
          time: timing.time,
        })).sort((a, b) => a.time > b.time ? 1 : -1) ?? [],
      };
    }
  }

  public async updateRemindConfig(
    data: Partial<IConfigRemind>,
    companyId: string,
  ): Promise<any> {
    const type = data.type;
    const { timings: sentTimings, ...sentConfig } = data;
    const config = await RemindConfigRepository.findOneBy({ companyId, type });    
    if (config) {
      const operations: Promise<any>[] = [];
      const updatedConfig: RemindConfig = { ...config, ...sentConfig };
      operations.push(RemindConfigRepository.upsert(updatedConfig, []));
      // TODO: Add BOT to Channel
      // if (sentConfig.channel) {
      //   operations.push(this.joinChannel(companyId, sentConfig.chatToolId ?? config.chatToolId, sentConfig.channel));
      // }
      if (sentTimings) {
        const timings = await RemindTimingRepository.findBy({ configId: config.id });
        if (timings.length) {
          const storedTimes = timings.map(t => t.time);
          const [addedTimes, deletedTimes] = extractArrayDifferences(sentTimings?.map(t => t.time) ?? [], storedTimes);
          const addedTimings: RemindTiming[] = addedTimes.map(time => {
            return new RemindTiming({
              config,
              time,
            });
          });
          const deletedTimings: RemindTiming[] = timings.filter(t => deletedTimes.includes(t.time));
          const modifiedTimings: RemindTiming[] = timings
            .filter(t => ![...addedTimes, ...deletedTimes].includes(t.time))
            .map(timing => ({
              ...timing,
              ...sentTimings.find(t => t.time === timing.time),
            }));
          operations.push(
            RemindTimingRepository.upsert([...addedTimings, ...modifiedTimings], []),
            deletedTimings.length ? RemindTimingRepository.softDelete(deletedTimings.map(e => e.id)) : null,
          );
        } else {
          operations.push(RemindTimingRepository.save(sentTimings.map(t => {
            return new RemindTiming({
              config,
              time: t.time,
            });
          })));
        }
      }
      await Promise.all(operations);
    } else {
      const config = new RemindConfig({
        company: companyId,
        type: data.type,
        enabled: data.enabled,
        chatToolId: data.chatToolId,
        channel: data.channel,
        frequency: data.frequency,
        limit: data.limit,
      });
      const savedConfig = await RemindConfigRepository.save(config);
      const timings = sentTimings?.map(t => {
        return new RemindTiming({
          config: savedConfig,
          time: t.time,
        });
      }) ?? [];
      await RemindTimingRepository.upsert(timings, []);
    }
  }
}
