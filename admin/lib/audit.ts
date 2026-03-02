import { prisma } from "./prisma";
import { AuditAction } from "@prisma/client";

export async function createAuditLog(params: {
  adminId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      before: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
      after: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
      ipAddress: params.ipAddress,
    },
  });
}
