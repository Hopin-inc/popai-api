import { Controller } from "tsoa";
import Container from "typedi";
import { Request, Response } from "express";

import User from "@/entities/settings/User";
import SlackRepository from "@/repositories/SlackRepository";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";

import logger from "@/libs/logger";
import TaskService from "@/services/TaskService";
import {
  AskPlanModalItems,
  ReliefCommentModalItems,
  SEPARATOR,
  SlackActionLabel,
  SlackModalLabel,
} from "@/consts/slack";
import { Option } from "@slack/web-api";
import { SlackInteractionPayload, SlackView } from "@/types/slack";
import SlackOAuthClient from "@/integrations/SlackOAuthClient";

export default class SlackController extends Controller {
  private slackRepository: SlackRepository;
  private taskService: TaskService;
  private readonly slackOAuthService: SlackOAuthClient;

  constructor() {
    super();
    this.slackRepository = Container.get(SlackRepository);
    this.taskService = Container.get(TaskService);
    this.slackOAuthService = Container.get(SlackOAuthClient);
  }

  public async handleInstallPath(req: Request, res: Response) {
    return await this.slackOAuthService.handleInstallPath(req, res);
  }

  public async handleCallback(req: Request, res: Response) {
    await this.slackOAuthService.handleCallback(req, res);
  }

  async handleEvent(payload: SlackInteractionPayload): Promise<[any, (...args) => unknown | undefined]> {
    try {
      if (payload.type === "block_actions") {
        const { user, container, actions, trigger_id: triggerId } = payload;
        if (!actions.length) {
          return;
        }

        const slackId = user.id;
        const { action_id: actionId } = actions[0];
        const [identifier, value, companyId] = actionId.split(SEPARATOR);
        const slackUser = await this.slackRepository.getUserFromSlackId(slackId, companyId);

        const channelId = container.channel_id;
        const threadId = container.message_ts;

        logger.info(
          `Received: Slack Webhook { type: ${ payload.type }, user: ${ slackUser.id }, action: ${ actionId } }`,
          payload,
        );
        return [
          await this.handleBlockActions(slackUser, slackId, channelId, threadId, triggerId, identifier, value),
          undefined,
        ];
      } else if (payload.type === "view_submission") {
        const { user, view } = payload;
        const [modalLabel, companyId] = view.callback_id.split(SEPARATOR);
        const slackUser = await this.slackRepository.getUserFromSlackId(user.id, companyId);
        logger.info(
          `Received: Slack Webhook { type: ${ payload.type }, user: ${ slackUser.id }, view: ${ view.type } }`,
          payload,
        );
        return await this.handleViewSubmissions(slackUser, view, modalLabel);
      } else {
        logger.error("Unknown Response");
      }
    } catch (error) {
      logger.error(error.message, error);
    }
  }

  private async handleBlockActions(
    user: User,
    slackId: string,
    channelId: string,
    threadId: string,
    triggerId: string,
    identifier: string,
    value: string,
  ) {
    if (!user) {
      return;
    }
    switch (identifier) {
      case SlackActionLabel.PROSPECT:
        await this.slackRepository.respondToProspect(user, slackId, parseInt(value), channelId, threadId);
        break;
      case SlackActionLabel.RELIEF_ACTION:
        await this.slackRepository.respondToReliefAction(user, parseInt(value), channelId, threadId);
        break;
      case SlackActionLabel.OPEN_RELIEF_COMMENT_MODAL:
        await this.slackRepository.openReliefCommentModal(user.companyId, channelId, threadId, triggerId);
        break;
      case SlackActionLabel.OPEN_ASK_MODAL:
        await this.slackRepository.openPlanModal(user, channelId, triggerId, parseInt(value));
        break;
      default:
        break;
    }
  }

  private async handleViewSubmissions(user: User, view: SlackView, modalLabel: string): Promise<[any, (...args) => unknown | undefined]> {
    if (view.type === "modal") {
      switch (modalLabel) {
        case SlackModalLabel.PLAN:
          const selectedOptions = this.getInputValue<Option[]>(
            view,
            AskPlanModalItems.TODOS,
            AskPlanModalItems.TODOS,
            "selected_options",
          );
          const todoIds = selectedOptions.map(option => option.value);
          return [
            undefined,
            async () => {
              const todos = await TodoRepository.getTodosByIds(todoIds);
              await this.slackRepository.askProspectsOnTodos(user.company, { todos, users: [user] });
            },
          ];
        case SlackModalLabel.RELIEF_COMMENT:
          const comment = this.getInputValue<string>(
            view,
            ReliefCommentModalItems.COMMENT,
            ReliefCommentModalItems.COMMENT,
          );
          const prospect = await this.slackRepository.receiveReliefComment(view.id, comment);
          return [
            undefined,
            async () => await this.slackRepository.shareReliefComment(view.id, comment, prospect),
          ];
        default:
          break;
      }
    }
  }

  private getInputValue<T>(view: SlackView, blockId: string, actionId: string, key: string = "value"): T {
    const values = view?.state?.values;
    if (!values) {
      return null;
    }
    const targetBlocks = values[blockId];
    if (!targetBlocks) {
      return null;
    }
    const targetInput = targetBlocks[actionId];
    if (!targetInput) {
      return null;
    } else {
      return targetInput[key] as T;
    }
  }
}
