import Todo from "@/entities/Todo";
import ChatTool from "@/entities/ChatTool";
import User from "@/entities/User";
import { Block, InputBlock, KnownBlock } from "@slack/web-api";

export type ITodoSlack = {
  todo: Todo;
  remindDays: number;
  chatTool: ChatTool;
  user: User;
};

export type SlackInteractionPayload = {
  team: SlackTeam;
  user: SlackUser;
} & (BlockActionsPayload | MessageActionsPayload | ViewClosedPayload | ViewSubmissionPayload);

type BlockActionsPayload = {
  type: "block_actions";
  api_app_id: string;
  container: MessageContainer | ViewContainer;
  token: string;
  trigger_id: string;
  channel: SlackChannel;
  message: unknown;
  response_url: string;
  actions: Action[];
};

type MessageActionsPayload = {
  type: "message_actions";
  [key: string]: unknown;
};

type ViewClosedPayload = {
  type: "view_closed";
  [key: string]: unknown;
};

type ViewSubmissionPayload = {
  type: "view_submission";
  view: SlackView;
};

type SlackTeam = {
  id: string;
  domain: string;
}

type SlackUser = {
  id: string;
  username: string;
  team_id: string;
};

type MessageContainer = {
  type: "message";
  message_ts: string;
  attachment_id: number;
  channel_id: string;
  is_ephemeral: boolean;
  is_app_unfurl: boolean;
};

type ViewContainer = {
  type: "view";
  view_id: string;
};

type SlackChannel = {
  id: string;
  name: string;
}

type Action = {
  action_id: string;
  block_id: string;
  text: Text;
  value: string;
  type: string;
  action_ts: string;
};

export type SlackView = {
  id: string;
  type: "modal";
  title: Text;
  submit?: Text;
  cancel?: Text;
  blocks: (KnownBlock | Block)[];
  private_metadata: string;
  callback_id: string;
  hash: string;
  state: {
    values: {
      [block_id: string]: {
        [action_id: string]: {
          type: InputBlock["element"]["type"];
          value?: unknown;
        };
      };
    };
  };
  response_urls: ResponseUrl[];
};

type Text = {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
};

type ResponseUrl = {
  block_id: string;
  action_id: string;
  channel_id: string;
  response_url: string;
};
