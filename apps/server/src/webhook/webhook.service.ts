import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";

import { Config } from "../config/schema";

@Injectable()
export class WebhookService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<Config>,
  ) {}
  private readonly logger = new Logger(WebhookService.name);

  async sendUserCreatedWebhook(user: User) {
    const webhookUrl = this.configService.get("USER_CREATED_WEBHOOK_URL");

    if (!webhookUrl) {
      this.logger.warn("USER_CREATED_WEBHOOK_URL is not set");
      return;
    }

    try {
      await this.httpService.axiosRef.post(webhookUrl, {
        event: "user.created",
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          createdAt: user.createdAt,
          provider: user.provider,
          emailVerified: user.emailVerified,
        },
      });

      this.logger.log(`Webhook sent successfully for user: ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to send webhook for user: ${user.id}`, error);
    }
  }
}
