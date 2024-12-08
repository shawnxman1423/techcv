import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";

import { WebhookService } from "./webhook.service";

@Module({
  imports: [HttpModule],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
