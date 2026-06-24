import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { NotificationInboxService } from "../application/notification-inbox.service";

@Controller("me/notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly inbox: NotificationInboxService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    return this.inbox.list(user.id, unreadOnly === "true");
  }

  @Post(":id/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.inbox.markRead(user.id, id);
  }

  @Post("read-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() user: AuthUser) {
    await this.inbox.markAllRead(user.id);
  }
}
