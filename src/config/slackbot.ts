import dotenv from 'dotenv';
import path from 'path';

// Load env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = require('@slack/socket-mode'),
  slackbotConfig = new Client(process.env.SLACK_ACCESS_TOKEN);

export const SlackBot = new Client(slackbotConfig);