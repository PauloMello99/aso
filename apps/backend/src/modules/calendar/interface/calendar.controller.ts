import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { ListCalendarEventsUseCase } from "../application/use-cases/list-calendar-events.use-case";
import { CreateCalendarEventUseCase } from "../application/use-cases/create-calendar-event.use-case";
import { UpdateCalendarEventUseCase } from "../application/use-cases/update-calendar-event.use-case";
import { DeleteCalendarEventUseCase } from "../application/use-cases/delete-calendar-event.use-case";
import { CreateCalendarEventDto } from "./dto/create-calendar-event.dto";
import { UpdateCalendarEventDto } from "./dto/update-calendar-event.dto";

function parseDate(value: string | undefined, field: string): Date {
  if (!value) throw new BadRequestException(`${field} is required`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`${field} must be a valid date`);
  }
  return d;
}

@Controller("orgs/:orgId/calendar")
@UseGuards(AuthGuard, OrgMembershipGuard)
export class CalendarController {
  constructor(
    private readonly listEvents: ListCalendarEventsUseCase,
    private readonly createEvent: CreateCalendarEventUseCase,
    private readonly updateEvent: UpdateCalendarEventUseCase,
    private readonly deleteEvent: DeleteCalendarEventUseCase,
  ) {}

  @Get()
  async list(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Query("start") start: string,
    @Query("end") end: string,
    @Query("assignedTo") assignedTo?: string,
  ) {
    return this.listEvents.execute({
      orgId,
      authId: user.id,
      start: parseDate(start, "start"),
      end: parseDate(end, "end"),
      assignedTo: assignedTo || undefined,
    });
  }

  @Post()
  async create(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCalendarEventDto,
  ) {
    return this.createEvent.execute({
      orgId,
      authId: user.id,
      assignedTo: dto.assignedTo ?? null,
      type: dto.type,
      title: dto.title,
      description: dto.description ?? null,
      customerId: dto.customerId ?? null,
      startsAt: parseDate(dto.startsAt, "startsAt"),
      endsAt: parseDate(dto.endsAt, "endsAt"),
      allDay: dto.allDay,
    });
  }

  @Patch(":id")
  async update(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.updateEvent.execute({
      id,
      orgId,
      authId: user.id,
      type: dto.type,
      status: dto.status,
      title: dto.title,
      description: dto.description,
      customerId: dto.customerId,
      startsAt: dto.startsAt ? parseDate(dto.startsAt, "startsAt") : undefined,
      endsAt: dto.endsAt ? parseDate(dto.endsAt, "endsAt") : undefined,
      allDay: dto.allDay,
    });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteEvent.execute({ id, orgId, authId: user.id });
  }
}
