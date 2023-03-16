import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import path from "path";
import { ClientOptions } from "@notionhq/client/build/src/Client";

dotenv.config({ path: path.join(__dirname, "../.env") });

const notionClientConfig: ClientOptions = {
  auth: process.env.NOTION_ACCESS_TOKEN,
};

const notionClient = new Client(notionClientConfig);
export default notionClient;