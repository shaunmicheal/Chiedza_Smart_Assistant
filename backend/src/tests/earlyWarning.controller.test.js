vi.mock("../config/prisma.js", () => ({
  default: {
    earlyWarningAlert: {
      findMany: vi.fn(),
    },
    classTeacher: {
      findMany: vi.fn(),
    },
  },
}));

import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../config/prisma.js";
import { listAlerts } from "../controllers/earlyWarning.controller.js";

describe("Early warning alert list permissions", () => {
  const alerts = [{ id: "alert-1", classId: "class-1" }];

  const createResponse = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.earlyWarningAlert.findMany.mockResolvedValue(alerts);
    prisma.classTeacher.findMany.mockResolvedValue([
      { classId: "class-1" },
    ]);
  });

  it("allows SCHOOL_ADMIN to list all alerts in their school", async () => {
    const req = {
      role: "SCHOOL_ADMIN",
      schoolId: "school-1",
      query: {},
    };
    const res = createResponse();
    const next = vi.fn();

    await listAlerts(req, res, next);

    expect(prisma.earlyWarningAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "school-1" },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: alerts,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows TEACHER to list alerts from assigned classes only", async () => {
    const req = {
      role: "TEACHER",
      schoolId: "school-1",
      membership: { id: "membership-1" },
      query: {},
    };
    const res = createResponse();
    const next = vi.fn();

    await listAlerts(req, res, next);

    expect(prisma.classTeacher.findMany).toHaveBeenCalledWith({
      where: {
        schoolId: "school-1",
        membershipId: "membership-1",
      },
      select: { classId: true },
    });

    expect(prisma.earlyWarningAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          schoolId: "school-1",
          classId: { in: ["class-1"] },
        },
      }),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns an empty list when a teacher requests an unassigned class", async () => {
    const req = {
      role: "TEACHER",
      schoolId: "school-1",
      membership: { id: "membership-1" },
      query: { classId: "class-2" },
    };
    const res = createResponse();
    const next = vi.fn();

    await listAlerts(req, res, next);

    expect(prisma.earlyWarningAlert.findMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns an empty list when a teacher has no class assignments", async () => {
    prisma.classTeacher.findMany.mockResolvedValue([]);

    const req = {
      role: "TEACHER",
      schoolId: "school-1",
      membership: { id: "membership-1" },
      query: {},
    };
    const res = createResponse();
    const next = vi.fn();

    await listAlerts(req, res, next);

    expect(prisma.earlyWarningAlert.findMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects PARENT access", async () => {
    const req = {
      role: "PARENT",
      schoolId: "school-1",
      query: {},
    };
    const res = createResponse();
    const next = vi.fn();

    await listAlerts(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403 }),
    );
    expect(prisma.earlyWarningAlert.findMany).not.toHaveBeenCalled();
    expect(prisma.classTeacher.findMany).not.toHaveBeenCalled();
  });
});
