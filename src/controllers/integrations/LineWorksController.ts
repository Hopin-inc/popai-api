import { Controller } from "tsoa";
import { Request } from "express";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import LineWorksRepository from "@/repositories/LineWorksRepository";
import ImplementedChatTool from "@/entities/settings/ImplementedChatTool";
import { ChatToolId } from "@/consts/common";
import Company from "@/entities/settings/Company";
import Container from "typedi";

export default class LineWorksController extends Controller {
  private lineWorksRepository: LineWorksRepository;

  constructor() {
    super();
    this.lineWorksRepository = Container.get(LineWorksRepository);
  }

  public async handleInstall(req: Request, company: Company) {
    const { client_id, client_secret, service_account, secret_key } = req.body;

    const installation = await this.lineWorksRepository.getInstallation(req);

    // Error when client_id or client_secret is incorrect
    if (installation.returnCode) return installation;

    // Error when service_account is incorrect
    if (installation.response) return installation.response.data;

    return await ImplementedChatToolRepository.save(
      new ImplementedChatTool(
        company,
        ChatToolId.LINEWORKS,
        installation,
        null,
        client_id,
        client_secret,
        service_account,
        secret_key,
      ),
    );
  }

  public async updateInstall(req: Request, company: Company) {
    const { bot_id } = req.body;
    const companyId = typeof company === "string" ? company : company.id;
    return await ImplementedChatToolRepository.update(companyId, {
      botId: bot_id,
    });
  }
}
