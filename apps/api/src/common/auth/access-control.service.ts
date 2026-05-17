import { ForbiddenException, Injectable } from "@nestjs/common";
import type { ViewerContext } from "@ib-marketplace/shared";

@Injectable()
export class AccessControlService {
  hasCapability(viewer: ViewerContext, permission: string) {
    return viewer.role === "super_admin" || viewer.permissions?.includes(permission) || viewer.permissions?.includes("*");
  }
  assertCapability(viewer: ViewerContext, permission: string, entityId?: string) {
    if (viewer.role === "super_admin") return;
    if (entityId && viewer.entityId && entityId !== viewer.entityId) throw new ForbiddenException("Cross-entity access denied");
    if (!this.hasCapability(viewer, permission)) throw new ForbiddenException(`Missing permission: ${permission}`);
  }
}
