import { Service } from "typedi";
import { FindOptionsWhere, In } from "typeorm";
import {
  Block,
  ChatPostMessageArguments,
  ChatPostMessageResponse,
  ChatUpdateResponse,
  KnownBlock,
  MessageAttachment,
} from "@slack/web-api";
import SlackMessageBuilder from "@/common/SlackMessageBuilder";

import Company from "@/entities/settings/Company";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";

import { TodoRepository } from "@/repositories/transactions/TodoRepository";

import Prospect from "@/entities/transactions/Prospect";
import { reliefActions, SlackModalLabel } from "@/consts/slack";
import { UserRepository } from "@/repositories/settings/UserRepository";
import { ProspectRepository } from "@/repositories/transactions/ProspectRepository";
import { ReportingLineRepository } from "@/repositories/settings/ReportingLineRepository";
import SlackClient from "@/integrations/SlackClient";
import ProspectConfig from "@/entities/settings/ProspectConfig";
import { ProspectConfigRepository } from "@/repositories/settings/ProspectConfigRepository";
import { filterProspectTargetItems } from "@/utils/tasks";
import { AskMode, AskType, ChatToolId } from "@/consts/common";
import ProspectTiming from "@/entities/settings/ProspectTiming";
import Project from "@/entities/transactions/Project";
import { ProjectRepository } from "@/repositories/transactions/ProjectRepository";

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

  public async getTodoFromProspect(channelId: string, threadId: string): Promise<Todo | null> {
    const prospect = await ProspectRepository.findOne({
      where: { appChannelId: channelId, appThreadId: threadId },
      relations: ["todo"],
    });
    return prospect?.todo;
  }

  public async pushSlackMessage(
    user: User,
    message: { blocks: (Block | KnownBlock)[], attachments?: MessageAttachment[] },
    channelId: string,
    threadId?: string,
  ): Promise<ChatPostMessageResponse> {
    const slackBot = await SlackClient.init(user.companyId);
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
    const todo = await this.getTodoFromProspect(appChannelId, appThreadId);
    if (todo) {
      const where: FindOptionsWhere<Prospect> = {
        todoId: todo.id,
        chatToolId: CHAT_TOOL_ID,
        appChannelId,
        appThreadId,
      };
      const { blocks } = SlackMessageBuilder.createAskActionMessageAfterProspect(todo, prospectValue);
      await Promise.all([
        slackBot.updateMessage({ channel: appChannelId, ts: appThreadId, text: todo.name, blocks }),
        ProspectRepository.update(where, { prospectValue, prospectRespondedAt: new Date() }),
      ]);
    }
  }

  public async respondToReliefAction(
    user: User,
    action: number,
    appChannelId: string,
    appThreadId: string,
  ) {
    const slackBot = await SlackClient.init(user.companyId);
    const todo = await this.getTodoFromProspect(appChannelId, appThreadId);
    const where: FindOptionsWhere<Prospect> = { todoId: todo.id, chatToolId: CHAT_TOOL_ID, appChannelId, appThreadId };
    const prospectRecord = await ProspectRepository.findOneBy(where);
    if (prospectRecord) {
      const { prospectValue } = prospectRecord;
      const { blocks } = SlackMessageBuilder.createAskCommentMessageAfterReliefAction(todo, prospectValue, action);
      await Promise.all([
        ProspectRepository.update(where, { actionValue: action, actionRespondedAt: new Date() }),
        slackBot.updateMessage({ channel: appChannelId, ts: appThreadId, text: todo.name, blocks }),
      ]);
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
        `${ targetAction.text }について相談する`,
        blocks,
        SlackModalLabel.RELIEF_COMMENT,
      );
      await ProspectRepository.update(where, { appViewId: viewId });
    }
  }

  public async openPlanModal(user: User, channelId: string, triggerId: string, mode: number) {
    const [todos, prospectConfig]: [Todo[], ProspectConfig] = await Promise.all([
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
      relations: ["company.prospectConfigs"],
    });
    await ProspectRepository.update(prospectRecord.id, { comment, commentRespondedAt: new Date() });
    return prospectRecord;
  }

  public async shareReliefCommentAndUpdateDailyReport(viewId: string, comment: string, prospectRecord: Prospect) {
    if (prospectRecord) {
      const [todo, user]: [Todo, User] = await Promise.all([
        TodoRepository.findOne({
          where: { id: prospectRecord.todoId },
          relations: ["company.implementedChatTool", "company.prospectConfigs"],
        }),
        UserRepository.findOne({
          where: { id: prospectRecord.userId },
          relations: ["company", "chatToolUser"],
        }),
      ]);
      const slackProfile = await this.getUserProfile(user.companyId, user.chatToolUser.appUserId);
      const iconUrl = slackProfile?.profile?.image_48;
      await this.shareReliefComment(todo, user, prospectRecord, comment, iconUrl);
    }
  }

  private async shareReliefComment(
    todo: Todo,
    user: User,
    prospectRecord: Prospect,
    comment: string,
    iconUrl: string,
  ) {
    const slackBot = await SlackClient.init(user.companyId);
    const { prospectValue, actionValue, appChannelId: channel, appThreadId: ts } = prospectRecord;
    const { blocks: editedMsg } = SlackMessageBuilder.createThanksForCommentMessage(todo, prospectValue, actionValue, comment);
    const sharedChannel = prospectRecord.company.prospectConfigs.find(c => c.type === AskType.TODOS).channel;
    const shareMsg = SlackMessageBuilder.createShareReliefMessage(todo, user, prospectValue, actionValue, comment, iconUrl);
    const [_, superiorUsers, pushedMessage]: [ChatUpdateResponse, User[], ChatPostMessageResponse] = await Promise.all([
      slackBot.updateMessage({ channel, ts, text: todo.name, blocks: editedMsg }),
      this.getSuperiorUsers(user.chatToolUser.appUserId),
      this.pushSlackMessage(user, shareMsg, sharedChannel),
    ]);
    const promptMsg = SlackMessageBuilder.createPromptDiscussionMessage(superiorUsers);
    await this.pushSlackMessage(user, promptMsg, pushedMessage.channel, pushedMessage.ts);
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
