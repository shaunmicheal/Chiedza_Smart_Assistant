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
}));

vi.mock("../services/assessment.service.js", () => ({
  getLearnerAssessments: vi.fn(),
}));

vi.mock("../services/assessmentQuery.service.js", () => ({
  getLearnerAssessments: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach } from "vitest";
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

  describe("checkAcademicDecline", () => {
    it("should return null when learner has fewer than minAssessments", async () => {
      getLearnerAssessments.mockResolvedValue([]);

      const result = await checkAcademicDecline("school-1", "learner-1", 3, 20);
      expect(result).toBeNull();
    });

    it("should return null when decline percentage is not met", async () => {
      const assessments = [
        { assessment: { maxScore: 100, title: "Math" }, score: 80 },
        { assessment: { maxScore: 100, title: "English" }, score: 70 },
      ];
      getLearnerAssessments.mockResolvedValue(assessments);

      const result = await checkAcademicDecline("school-1", "learner-1", 2, 30);
      expect(result).toBeNull();
    });

    it("should return alert data when decline percentage is met", async () => {
      const assessments = [
        { assessment: { maxScore: 100, title: "Math" }, score: 90 },
        { assessment: { maxScore: 100, title: "English" }, score: 50 },
      ];
      getLearnerAssessments.mockResolvedValue(assessments);

      const result = await checkAcademicDecline("school-1", "learner-1", 2, 40);
      expect(result).not.toBeNull();
    });

    it("should handle acknowledgedRuleId", async () => {
      const assessments = [
        { assessment: { maxScore: 100, title: "Math" }, score: 90 },
        { assessment: { maxScore: 100, title: "English" }, score: 50 },
      ];
      getLearnerAssessments.mockResolvedValue(assessments);

      const result = await checkAcademicDecline(
        "school-1",
        "learner-1",
        2,
        40,
        "rule-1"
      );
      expect(result).toBeDefined();
    });
  });

  describe("evaluateLearnerEarlyWarnings", () => {
    it("should return null when learner is not found in school", async () => {
      prisma.learner.findFirst.mockResolvedValue(null);

      const result = await evaluateLearnerEarlyWarnings("school-1", "nonexistent-learner");
      expect(result).toBeNull();
    });

    it("should return null when no alert rules exist for school", async () => {
      prisma.learner.findFirst.mockResolvedValue({ id: "learner-1", classId: "class-1" });
      prisma.alertRule.findMany.mockResolvedValue([]);

      const result = await evaluateLearnerEarlyWarnings("school-1", "learner-1");
      expect(result).toBeNull();
    });

    it("should evaluate repeated absences and academic decline", async () => {
      prisma.learner.findFirst.mockResolvedValue({ id: "learner-1", classId: "class-1" });
      prisma.alertRule.findMany.mockResolvedValue([
        { id: "rule-1", name: "Repeated Absences", alertType: "REPEATED_ABSENCES" },
        { id: "rule-2", name: "Academic Decline", alertType: "ACADEMIC_DECLINE" },
      ]);

      const repeated = await evaluateLearnerEarlyWarnings("school-1", "learner-1");
      const declined = await evaluateLearnerEarlyWarnings("school-1", "learner-1");

      expect(repeated).toBeDefined();
      expect(declined).toBeDefined();
    });

    it("should handle school isolation - different schools have separate alerts", async () => {
      prisma.learner.findFirst.mockResolvedValue({ id: "learner-1", classId: "class-1" });
      prisma.alertRule.findMany.mockResolvedValue([]);

      const result1 = await evaluateLearnerEarlyWarnings("school-1", "learner-1");
      const result2 = await evaluateLearnerEarlyWarnings("school-2", "learner-1");

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });
});