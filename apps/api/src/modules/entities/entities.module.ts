import { Module } from "@nestjs/common";
import { EntitiesController } from "./entities.controller";
import { EntitiesService } from "./entities.service";
import { PrismaService } from "../../prisma/prisma.service";
import { DomainEventsService } from "../../common/infrastructure/domain-events.service";
import { AccessControlService } from "../../common/auth/access-control.service";

@Module({
  controllers: [EntitiesController],
  providers: [PrismaService, DomainEventsService, AccessControlService, EntitiesService],
  exports: [EntitiesService]
})
export class EntitiesModule {}
