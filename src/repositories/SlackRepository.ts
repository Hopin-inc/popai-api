import { Service } from "typedi";
import { FindOptionsWhere, In } from "typeorm";
import {
  Block,
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  KnownBlock,
  MessageAttachment,
} from "@slack/web-api";
import SlackMessageBuilder from "@/common/SlackMessageBuilder";

import Company from "@/entities/settings/Company";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";

import { TodoRepository } from "@/repositories/transactions/TodoRepository";

import Prospect from "@/entities/transactions/Prospect";
import { prospects, reliefActions, SlackModalLabel } from "@/consts/slack";
import { UserRepository } from "@/repositories/settings/UserRepository";
import { ProspectRepository } from "@/repositories/transactions/ProspectRepository";
import { ReportingLineRepository } from "@/repositories/settings/ReportingLineRepository";
import SlackClient from "@/integrations/SlackClient";
import { ProspectConfigRepository } from "@/repositories/settings/ProspectConfigRepository";
import { filterProspectTargetItems } from "@/utils/tasks";
import { AskMode, AskType, ChatToolId, RemindType, TodoAppId } from "@/consts/common";
import ProspectTiming from "@/entities/settings/ProspectTiming";
import Project from "@/entities/transactions/Project";
import { ProjectRepository } from "@/repositories/transactions/ProjectRepository";
import BacklogClient from "@/integrations/BacklogClient";
import RemindTiming from "@/entities/settings/RemindTiming";
import RemindConfig from "@/entities/settings/RemindConfig";

const CHAT_TOOL_ID = ChatToolId.SLACK;

@Service()
export default class SlackRepository {
  private async sendDirectMessage(user: User, message: MessageAttachment) {
    if (user && user.chatToolUser?.chatToolId === ChatToolId.SLACK && user.chatToolUser?.appUserId) {
      const slackBot = await SlackClient.init(user.companyId);
      return slackBot.postDirectMessage(user.chatToolUser.appUserId, message.blocks);
    }
  }

  public async getSuperiorUsers(slackId: string): Promise<User[]> {
    const users = await UserRepository.getUserByAppUserId(slackId);
    if (!users.length) {
      return Promise.resolve([]);
    }
    const userIds: string[] = users.map(user => user.id);
    const reportingLines = await ReportingLineRepository.findBy({
      subordinateUserId: In(userIds),
    });
    if (!reportingLines.length) {
      return Promise.resolve([]);
    }
    return await UserRepository.find({
      where: { id: In(reportingLines.map(record => record.superiorUserId)) },
      relations: ["chatToolUser"],
    });
  }

  public async getProjectOrTodoFromProspect(channelId: string, threadId: string): Promise<Prospect | null> {
    return await ProspectRepository.findOne({
      where: { appChannelId: channelId, appThreadId: threadId },
      relations: ["todo", "project"],
    });
  }

  public async pushSlackMessage(
    companyId: string,
    message: { blocks: (Block | KnownBlock)[], attachments?: MessageAttachment[] },
    channelId: string,
    threadId?: string,
  ): Promise<ChatPostMessageResponse> {
    const slackBot = await SlackClient.init(companyId);
    const props: ChatPostMessageArguments = {
      channel: channelId,
      thread_ts: threadId,
      text: "お知らせ",
      blocks: message.blocks,
      attachments: message.attachments,
    };
    return slackBot.postMessage(props);
  }

  public async getUserFromSlackId(slackId: string, relations: string[] = []): Promise<User> {
    const users = await UserRepository.getUserByAppUserId(slackId, relations);
    return users.length ? users[0] : null;
  }

  public async askProspectsOnProjects(company: Company, target?: { projects: Project[], users: User[] }) {
    if (company?.prospectConfigs?.length) {
      const askedProspects: Prospect[] = [];
      const projects = target ? target.projects : await this.getProspectProjects(company);
      const users = target ? target.users : company.users;
      for (const user of users) {
        await Promise.all(
          projects
            .filter(project => project.users.map(u => u.id).includes(user.id))
            .map(async project => {
              const message = SlackMessageBuilder.createAskProspectMessageOnProjects(project);
              const { ts, channel } = await this.sendDirectMessage(user, message) ?? {};
              const prospect = new Prospect({
                project,
                user,
                company,
                chatToolId: CHAT_TOOL_ID,
                appChannelId: channel,
                appThreadId: ts,
              });
              askedProspects.push(prospect);
            }),
        );
      }
      await ProspectRepository.upsert(askedProspects, []);
    }
  }

  public async askProspectsOnTodos(company: Company, target?: { todos: Todo[], users: User[] }) {
    if (company?.prospectConfigs?.length) {
      const askedProspects: Prospect[] = [];
      const todos = target ? target.todos : await this.getProspectTodos(company);
      const users = target ? target.users : company.users;
      for (const user of users) {
        await Promise.all(
          todos
            .filter(project => project.users.map(u => u.id).includes(user.id))
            .map(async todo => {
              const message = SlackMessageBuilder.createAskProspectMessageOnTodos(todo);
              const { ts, channel } = await this.sendDirectMessage(user, message) ?? {};
              const prospect = new Prospect({
                todo,
                user,
                company,
                chatToolId: CHAT_TOOL_ID,
                appChannelId: channel,
                appThreadId: ts,
              });
              askedProspects.push(prospect);
            }),
        );
      }
      await ProspectRepository.upsert(askedProspects, []);
    }
  }

  private async getProspectProjects(company: Company): Promise<Project[]> {
    const projects = await ProjectRepository.getActiveProjects(company);
    return filterProspectTargetItems(
      projects,
      company.prospectConfigs.find(c => c.type === AskType.PROJECTS),
    );
  }

  private async getProspectTodos(company: Company): Promise<Todo[]> {
    const todos = await TodoRepository.getActiveTodos(company);
    return filterProspectTargetItems(
      todos,
      company.prospectConfigs.find(c => c.type === AskType.TODOS),
    );
  }

  public async askProjects(company: Company, _timing: ProspectTiming) {
    const projects = await this.getProspectProjects(company);
    if (projects?.length) {
      await Promise.all(company.users.map(user => {
        const assignedProjects = projects.filter(p => p.users.map(u => u.id).includes(user.id));
        this.askProspectsOnProjects(company, { projects: assignedProjects, users: [user] });
      }));
    }
  }

  public async askTodos(company: Company, timing: ProspectTiming) {
    if (timing.mode) {
      const message = SlackMessageBuilder.createAskPlansMessageOnTodos(timing.mode);
      const todos = await this.getProspectTodos(company);
      if (todos?.length) {
        await Promise.all(company.users.map(user => {
          const assignedTodos = todos.filter(t => t.users.map(u => u.id).includes(user.id));
          if (assignedTodos.length > 2) {
            this.sendDirectMessage(user, message);
          } else if (assignedTodos.length > 0) {
            this.askProspectsOnTodos(company, { todos: assignedTodos, users: [user] });
          }
        }));
      }
    }
  }

  public async respondToProspect(
    user: User,
    slackId: string,
    prospectValue: number,
    appChannelId: string,
    appThreadId: string,
  ) {
    const slackBot = await SlackClient.init(user.companyId);
    const prospect = await this.getProjectOrTodoFromProspect(appChannelId, appThreadId);
    const { project, todo } = prospect;
    const item = project ?? todo;
    if (item) {
      const { blocks } = SlackMessageBuilder.createAskActionMessageAfterProspect(item, prospectValue);
      await Promise.all([
        slackBot.updateMessage({ channel: appChannelId, ts: appThreadId, text: item.name, blocks }),
        ProspectRepository.update(prospect.id, {
          prospectValue,
          prospectRespondedAt: new Date(),
        }),
        this.storeEvidenceOnProspectResponded(user, item, prospect, prospectValue),
      ]);
    }
  }

  private async storeEvidenceOnProspectResponded<T extends Project | Todo>(
    user: User,
    item: T,
    prospect: Prospect,
    prospectValue: number,
  ) {
    if (item.todoAppId === TodoAppId.BACKLOG) {
      const client = await BacklogClient.init(item.companyId);
      const appId = item instanceof Project ? item.appProjectId : item.appTodoId;
      const userName = user.todoAppUser?.appUserId ? `@${ user.todoAppUser.appUserId }` : user.name;
      const prospectItem = prospects.find(p => p.value === prospectValue);
      const prospectText = prospectItem.emoji + prospectItem.text;
      const comment = await client.postComment(
        parseInt(appId),
        `${ userName } さんが見立てを回答しました。\n`
        + `【見立て】${ prospectText }`,
      );
      await ProspectRepository.update(prospect.id, { appCommentId: comment?.id?.toString() });
    }
  }

  public async respondToReliefAction(
    user: User,
    actionValue: number,
    appChannelId: string,
    appThreadId: string,
  ) {
    const slackBot = await SlackClient.init(user.companyId);
    const prospect = await this.getProjectOrTodoFromProspect(appChannelId, appThreadId);
    if (prospect) {
      const { project, todo } = prospect;
      const item = project ?? todo;
      if (!item) {
        return;
      }
      const { prospectValue } = prospect;
      const { blocks } = SlackMessageBuilder.createAskCommentMessageAfterReliefAction(item, prospectValue, actionValue);
      await Promise.all([
        ProspectRepository.update(prospect.id, { actionValue, actionRespondedAt: new Date() }),
        slackBot.updateMessage({ channel: appChannelId, ts: appThreadId, text: item.name, blocks }),
        this.storeEvidenceOnReliefActionResponded(item, prospect, prospectValue),
      ]);
    }
  }

  private async storeEvidenceOnReliefActionResponded<T extends Project | Todo>(
    item: T,
    prospect: Prospect,
    actionValue: number,
  ) {
    if (item.todoAppId === TodoAppId.BACKLOG && prospect.appCommentId) {
      const client = await BacklogClient.init(item.companyId);
      const appId = item instanceof Project ? item.appProjectId : item.appTodoId;
      const actionItem = reliefActions.find(p => p.value === actionValue);
      const actionText = actionItem.text;
      await client.addCommentRow(
        parseInt(appId),
        parseInt(prospect.appCommentId),
        `【相談事項】${ actionText }を見直したい`,
      );
    }
  }

  public async openReliefCommentModal(
    companyId: string,
    appChannelId: string,
    appThreadId: string,
    triggerId: string,
  ) {
    const where: FindOptionsWhere<Prospect> = { chatToolId: CHAT_TOOL_ID, appChannelId, appThreadId };
    const prospectRecord = await ProspectRepository.findOneBy(where);
    if (prospectRecord) {
      const { actionValue } = prospectRecord;
      const targetAction = reliefActions.find(a => a.value === actionValue);
      const blocks = SlackMessageBuilder.createReliefCommentModal();
      const viewId = await this.openModal(
        companyId,
        triggerId,
        targetAction ? `${ targetAction.text }について相談する` : "相談内容を記入する",
        blocks,
        SlackModalLabel.RELIEF_COMMENT,
      );
      await ProspectRepository.update(where, { appViewId: viewId });
    }
  }

  public async openPlanModal(user: User, channelId: string, triggerId: string, mode: number) {
    const [todos, prospectConfig] = await Promise.all([
      TodoRepository.getActiveTodos(user.company, user),
      ProspectConfigRepository.findOneBy({ companyId: user.companyId }),
    ]);
    const targetTodos = filterProspectTargetItems(todos, prospectConfig);
    const blocks = SlackMessageBuilder.createAskPlanModal(targetTodos, mode);
    const title = mode === AskMode.FORWARD
      ? "着手予定のタスクを選ぶ"
      : mode === AskMode.BACKWARD
        ? "取り組んだタスクを選ぶ"
        : "タスクを選ぶ";
    await this.openModal(user.companyId, triggerId, title, blocks, SlackModalLabel.PLAN);
  }

  public async receiveReliefComment(viewId: string, comment: string) {
    const prospectRecord = await ProspectRepository.findOne({
      where: { appViewId: viewId },
      relations: ["company.prospectConfigs", "project", "todo"],
    });
    await ProspectRepository.update(prospectRecord.id, { comment, commentRespondedAt: new Date() });
    return prospectRecord;
  }

  public async shareReliefComment(viewId: string, comment: string, prospect: Prospect) {
    if (!prospect) return;
    const { project, todo } = prospect;
    const item = project ?? todo;
    const user = await UserRepository.findOne({
      where: { id: prospect.userId },
      relations: ["company", "chatToolUser"],
    });
    const slackProfile = await this.getUserProfile(user.companyId, user.chatToolUser.appUserId);
    const iconUrl = slackProfile?.profile?.image_48;
    const slackBot = await SlackClient.init(user.companyId);
    const {
      prospectValue,
      actionValue,
      appChannelId: channel,
      appThreadId: ts,
    } = prospect;
    const { blocks: editedMsg } = SlackMessageBuilder.createThanksForCommentMessage(
      item,
      prospectValue,
      actionValue,
      comment,
    );
    const sharedChannel = prospect.company.prospectConfigs
      .find(c => c.type === (item instanceof Project ? AskType.PROJECTS : AskType.TODOS))
      ?.channel;
    const shareMsg = SlackMessageBuilder.createShareReliefMessage(item, user, prospectValue, actionValue, comment, iconUrl);
    const [superiorUsers, pushedMessage] = await Promise.all([
      this.getSuperiorUsers(user.chatToolUser.appUserId),
      this.pushSlackMessage(user.companyId, shareMsg, sharedChannel),
      slackBot.updateMessage({ channel, ts, text: item.name, blocks: editedMsg }),
      this.storeEvidenceOnCommentResponded(item, prospect, comment),
    ]);
    const promptMsg = SlackMessageBuilder.createPromptDiscussionMessage(superiorUsers);
    await this.pushSlackMessage(user.companyId, promptMsg, pushedMessage.channel, pushedMessage.ts);
  }

  public async remind(
    company: Company,
    timing: RemindTiming,
    config: RemindConfig,
  ) {
    const items: (Todo | Project)[] = config.type === RemindType.PROJECTS
      ? await TodoRepository.getRemindTodos(company.id, true, config.limit)
      : await ProjectRepository.getRemindProjects(company.id, true, config.limit);
    if (items.length) {
      const sharedMessage = SlackMessageBuilder.createPublicRemind(items);
      await Promise.all([
        ...company.users.map(async user => {
          const assignedItems = items.filter(i => i.users.map(u => u.id).includes(user.id));
          const message = SlackMessageBuilder.createPersonalRemind(assignedItems);
          await this.sendDirectMessage(user, message);
        }),
        this.pushSlackMessage(company.id, sharedMessage, config.channel),
      ]);
    }
  }

  private async storeEvidenceOnCommentResponded<T extends Project | Todo>(
    item: T,
    prospect: Prospect,
    comment: string,
  ) {
    if (item.todoAppId === TodoAppId.BACKLOG && prospect.appCommentId) {
      const client = await BacklogClient.init(item.companyId);
      const appId = item instanceof Project ? item.appProjectId : item.appTodoId;
      await client.addCommentRow(
        parseInt(appId),
        parseInt(prospect.appCommentId),
        `【コメント】${ comment }`,
      );
    }
  }

  private async getUserProfile(companyId: string, slackId: string) {
    const slackBot = await SlackClient.init(companyId);
    return slackBot.getProfile({ user: slackId });
  }

  private async openModal(
    companyId: string,
    triggerId: string,
    title: string,
    blocks: (KnownBlock | Block)[],
    callbackId: string,
    submit: string = "送信する",
    close: string = "キャンセル",
  ) {
    const slackBot = await SlackClient.init(companyId);
    const { ok, view } = await slackBot.openView({
      trigger_id: triggerId,
      view: {
        type: "modal",
        title: { type: "plain_text", emoji: true, text: title },
        submit: { type: "plain_text", emoji: true, text: submit },
        close: { type: "plain_text", emoji: true, text: close },
        blocks,
        callback_id: callbackId,
      },
    }) ?? {};
    if (ok && view) {
      return view.id;
    }
  }
}
