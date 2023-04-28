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
import { filterProspectTargetTodos } from "@/utils/tasks";
import { ChatToolId } from "@/consts/common";

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
    const users = await UserRepository.getChatToolUserByUserId(slackId);
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
    const users = await UserRepository.getChatToolUserByUserId(slackId, relations);
    return users.length ? users[0] : null;
  }

  public async askProspects(company: Company, target?: { todos: Todo[], user: User }) {
    if (company?.prospectConfig) {
      const askedProspects: Prospect[] = [];
      const todos = target ? target.todos : await this.getProspectTodos(company);
      await Promise.all(todos.map(async todo => {
        const message = SlackMessageBuilder.createAskProspectMessage(todo);
        const users = target ? [target.user] : todo.users;
        await Promise.all(users.map(async user => {
          if (user) {
            const { ts, channel } = await this.sendDirectMessage(user, message) ?? {};
            const prospect = new Prospect(todo.id, user.id, company.id, CHAT_TOOL_ID, channel, ts);
            askedProspects.push(prospect);
          }
        }));
      }));
      await ProspectRepository.upsert(askedProspects, []);
    }
  }

  private async getProspectTodos(company: Company): Promise<Todo[]> {
    const todos = await TodoRepository.getActiveTodos(company);
    return filterProspectTargetTodos(todos, company.prospectConfig);
  }

  public async askPlans(company: Company, milestone?: string) {
    const message = SlackMessageBuilder.createAskPlansMessage(milestone);
    const todos = await this.getProspectTodos(company);
    if (todos.length) {
      await Promise.all(company.users.map(user => {
        if (todos.some(t => t.users.some(u => u.id === user.id))) {
          this.sendDirectMessage(user, message);
        }
      }));
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

  public async openPlanModal(user: User, channelId: string, triggerId: string, milestoneText: string) {
    const [todos, prospectConfig]: [Todo[], ProspectConfig] = await Promise.all([
      TodoRepository.getActiveTodos(user.company, user),
      ProspectConfigRepository.findOneBy({ companyId: user.companyId }),
    ]);
    const targetTodos = filterProspectTargetTodos(todos, prospectConfig);
    const blocks = SlackMessageBuilder.createAskPlanModal(targetTodos, milestoneText);
    await this.openModal(user.companyId, triggerId, "着手するタスクを決める", blocks, SlackModalLabel.PLAN);
  }

  public async receiveReliefComment(viewId: string, comment: string) {
    const prospectRecord = await ProspectRepository.findOne({
      where: { appViewId: viewId },
      relations: ["company.prospectConfig"],
    });
    await ProspectRepository.update(prospectRecord.id, { comment, commentRespondedAt: new Date() });
    return prospectRecord;
  }

  public async shareReliefCommentAndUpdateDailyReport(viewId: string, comment: string, prospectRecord: Prospect) {
    if (prospectRecord) {
      const [todo, user]: [Todo, User] = await Promise.all([
        TodoRepository.findOne({
          where: { id: prospectRecord.todoId },
          relations: ["company.implementedChatTool", "company.prospectConfig"],
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
    const sharedChannel = prospectRecord.company.prospectConfig.channel;
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
