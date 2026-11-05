import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/prisma.js", () => ({
  default: {
    attendance: {
      findMany: vi.fn(),
    },
    earlyWarningAlert: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    learner: {
      findFirst: vi.fn(),
    },
    alertRule: {
      findMany: vi.fn(),
    },
  },
});

vi.mock("../services/assessment.service.js", () => ({
  getLearnerAssessments: vi.fn(),
}));

vi.mock("../services/assessmentQuery.service.js", () => ({
  getLearnerAssessments: vi.fn(),
}));

import prisma from "../config/prisma.js";
import { getLearnerAssessments } from "../services/assessmentQuery.service.js";
import {
  checkRepeatedAbsences,
  checkAcademicDecline,
  evaluateLearnerEarlyWarnings,
} from "../services/earlyWarning.service.js";

describe("Early warning service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.earlyWarningAlert.findFirst.mockResolvedValue(null);
    prisma.earlyWarningAlert.create.mockResolvedValue({ id: "alert-new" });
    prisma.learner.findFirst.mockResolvedValue({
      id: "learner-1",
      classId: "class-1",
    });
    prisma.alertRule.findMany.mockResolvedValue([]);
    getLearnerAssessments.mockResolvedValue([]);
  });

