vi.mock("../config/prisma.js", () => ({
  default: {
    attendance: { findMany: vi.fn() },
    earlyWarningAlert: { findFirst: vi.fn() },
    learner: { findFirst: vi.fn() },
    alertRule: { findMany: vi.fn() },
    parentCommunicationDraft: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    classTeacher: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    constructor() {
      this.chat = {
        completions: {
          create: mockOpenAICreate,
        },
      };
    }
  },
}));

vi.mock("../services/assessment.service.js", () => ({
  getLearnerAssessments: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../config/prisma.js";
import OpenAI from "openai";
import {
  listDrafts,
  generateDraft,
  editDraft,
  approveDraft,
} from "../controllers/draft.controller.js";

const { mockOpenAICreate } = vi.hoisted(() => ({
  mockOpenAICreate: vi.fn(),
}));

describe("Draft Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.classTeacher.findFirst.mockResolvedValue({ id: "assignment-1" });
    mockOpenAICreate.mockReset();
    process.env.GEMINI_API_KEY = "test-gemini-api-key";
  });

  describe("listDrafts", () => {
    it("should list all drafts for SCHOOL_ADMIN", async () => {
      const mockDrafts = [
        { id: "draft-1", schoolId: "s1", alertId: "a1", userId: "u1", alert: { classId: "c1" }, language: "en", draftText: "Hello", status: "DRAFT" },
        { id: "draft-2", schoolId: "s1", alertId: "a2", userId: "u1", language: "sn", draftText: "Mhoro", status: "DRAFT" },
      ];
      prisma.parentCommunicationDraft.findMany.mockResolvedValue(mockDrafts);
      const next = vi.fn();
      const req = { role: "SCHOOL_ADMIN", schoolId: "s1", memberships: [{ id: "m1", schoolId: "s1", role: "SCHOOL_ADMIN" }] };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await listDrafts(req, res, next);
      expect(prisma.parentCommunicationDraft.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { schoolId: "s1" } }));
      expect(res.json).toHaveBeenCalled();
    });

    it("should reject PARENT access via next", async () => {
      const next = vi.fn();
      const req = { role: "PARENT", schoolId: "s1" };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await listDrafts(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    });
  });

  describe("generateDraft", () => {
    const mockAlert = {
      id: "a1",
      schoolId: "s1",
      learnerId: "l1",
      classId: "c1",
      alertType: "REPEATED_ABSENCES",
      status: "ACTIVE",
      evidence: {
        absenceCount: 10,
        absenceDateRange: "2026-11-01T00:00:00.000Z",
        dateRangeEnd: "2026-11-05T00:00:00.000Z",
        threshold: 3,
        observationPeriodDays: 5,
      },
      alertRule: { id: "r1", name: "Repeated Absences", alertType: "REPEATED_ABSENCES" },
      learner: { id: "l1", firstName: "John", lastName: "Doe", classId: "c1" },
      class: { id: "c1", name: "Form 1" },
    };

    it("should generate draft when teacher is assigned", async () => {
      prisma.earlyWarningAlert.findFirst.mockResolvedValue(mockAlert);
      prisma.classTeacher.findFirst.mockResolvedValue({ id: "ct1", classId: "c1", membershipId: "m1" });

      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: "Shona message about absences" } }],
      });

      const next = vi.fn();
      const req = {
        role: "TEACHER",
        schoolId: "s1",
        user: { id: "u1" },
        membership: { id: "m1", schoolId: "s1", role: "TEACHER" },
        body: { alertId: "a1", language: "en" },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await generateDraft(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();

      const geminiRequest = mockOpenAICreate.mock.calls[0][0];
      const prompt = geminiRequest.messages[0].content;
      expect(prompt).toContain("Language required: English");
      expect(prompt).toContain('"absenceCount":10');
      expect(prompt).toContain('"absenceThreshold":3');
      expect(prompt).toContain('"observationPeriodDays":5');
      expect(prompt).not.toContain("2026-11-01");
      expect(prompt).not.toContain("2026-11-05");
      expect(prompt).not.toContain("John");
      expect(prompt).not.toContain("Doe");
      expect(prompt).toContain("Do not invent names, dates, causes");
      expect(prisma.parentCommunicationDraft.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            schoolId_alertId_userId_language_status: {
              schoolId: "s1",
              alertId: "a1",
              userId: "u1",
              language: "en",
              status: "DRAFT",
            },
          },
        }),
      );
    });

    it("should send academic percentages only and exclude assessment details from Gemini", async () => {
      const academicAlert = {
        ...mockAlert,
        alertType: "ACADEMIC_DECLINE",
        alertRule: {
          id: "r2",
          name: "Academic Decline",
          alertType: "ACADEMIC_DECLINE",
        },
        evidence: {
          assessmentsCompared: 3,
          declineThreshold: 20,
          firstAssessment: {
            title: "PRIVATE_FIRST_ASSESSMENT_TITLE",
            date: "2026-10-01T00:00:00.000Z",
            score: 91,
            maxScore: 100,
            percentage: 91,
          },
          lastAssessment: {
            title: "PRIVATE_LAST_ASSESSMENT_TITLE",
            date: "2026-11-01T00:00:00.000Z",
            score: 52,
            maxScore: 100,
            percentage: 52,
          },
        },
      };

      prisma.earlyWarningAlert.findFirst.mockResolvedValue(academicAlert);
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: "A supportive academic progress message." } }],
      });

      const next = vi.fn();
      const req = {
        role: "TEACHER",
        schoolId: "s1",
        user: { id: "u1" },
        membership: { id: "m1", schoolId: "s1", role: "TEACHER" },
        body: { alertId: "a1", language: "en" },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await generateDraft(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(next).not.toHaveBeenCalled();

      const prompt = mockOpenAICreate.mock.calls[0][0].messages[0].content;

      expect(prompt).toContain('"assessmentsCompared":3');
      expect(prompt).toContain('"declineThreshold":20');
      expect(prompt).toContain('"firstAssessmentPercentage":91');
      expect(prompt).toContain('"lastAssessmentPercentage":52');

      expect(prompt).not.toContain("PRIVATE_FIRST_ASSESSMENT_TITLE");
      expect(prompt).not.toContain("PRIVATE_LAST_ASSESSMENT_TITLE");
      expect(prompt).not.toContain("2026-10-01");
      expect(prompt).not.toContain("2026-11-01");
      expect(prompt).not.toContain('"score":91');
      expect(prompt).not.toContain('"score":52');
      expect(prompt).not.toContain('"maxScore":100');
      expect(prompt).not.toContain("John");
      expect(prompt).not.toContain("Doe");
    });

    it("should preserve a separate Shona draft for the same alert and user", async () => {
      prisma.earlyWarningAlert.findFirst.mockResolvedValue(mockAlert);
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: "Shona message" } }],
      });

      const next = vi.fn();
      const req = {
        role: "TEACHER",
        schoolId: "s1",
        user: { id: "u1" },
        membership: { id: "m1", schoolId: "s1", role: "TEACHER" },
        body: { alertId: "a1", language: "sn" },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await generateDraft(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      const prompt = mockOpenAICreate.mock.calls[0][0].messages[0].content;
      expect(prompt).toContain("Language required: Zimbabwean Shona");
      expect(prisma.parentCommunicationDraft.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            schoolId_alertId_userId_language_status: {
              schoolId: "s1",
              alertId: "a1",
              userId: "u1",
              language: "sn",
              status: "DRAFT",
            },
          },
        }),
      );
    });

    it("should reject parent access via next", async () => {
      prisma.earlyWarningAlert.findFirst.mockResolvedValue(mockAlert);
      const next = vi.fn();
      const req = { role: "PARENT", schoolId: "s1", body: { alertId: "a1", language: "en" } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await generateDraft(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    });

    it("should return error when Gemini key is missing", async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      try {
        prisma.earlyWarningAlert.findFirst.mockResolvedValue(mockAlert);
        const next = vi.fn();
        const req = {
          role: "TEACHER",
          schoolId: "s1",
          user: { id: "u1" },
          membership: { id: "m1", schoolId: "s1", role: "TEACHER" },
          body: { alertId: "a1", language: "en" },
        };
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await generateDraft(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
      } finally {
        if (originalKey === undefined) {
          delete process.env.GEMINI_API_KEY;
        } else {
          process.env.GEMINI_API_KEY = originalKey;
        }
      }
    });
  });

  describe("editDraft", () => {
    it("should allow draft creator to edit", async () => {
      const mockDraft = { id: "draft-1", schoolId: "s1", alertId: "a1", userId: "u1", alert: { classId: "c1" }, language: "en", draftText: "Old text", status: "DRAFT" };
      prisma.parentCommunicationDraft.findFirst.mockResolvedValue(mockDraft);
      const next = vi.fn();
      const req = {
        role: "TEACHER",
        schoolId: "s1",
        user: { id: "u1" },
        membership: { id: "m1", schoolId: "s1", role: "TEACHER" },
        params: { draftId: "draft-1" },
        body: { draftText: "New text" },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await editDraft(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it("should reject editing APPROVED draft via next", async () => {
      const mockDraft = { id: "draft-1", schoolId: "s1", alertId: "a1", userId: "u1", alert: { classId: "c1" }, language: "en", draftText: "Old text", status: "APPROVED" };
      prisma.parentCommunicationDraft.findFirst.mockResolvedValue(mockDraft);
      const next = vi.fn();
      const req = {
        role: "TEACHER",
        schoolId: "s1",
        user: { id: "u1" },
        membership: { id: "m1", schoolId: "s1", role: "TEACHER" },
        params: { draftId: "draft-1" },
        body: { draftText: "New text" },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await editDraft(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 409 }));
    });

    it("should reject empty draft text via next", async () => {
      const mockDraft = { id: "draft-1", schoolId: "s1", alertId: "a1", userId: "u1", alert: { classId: "c1" }, language: "en", draftText: "Old text", status: "DRAFT" };
      prisma.parentCommunicationDraft.findFirst.mockResolvedValue(mockDraft);
      const next = vi.fn();
      const req = {
        role: "TEACHER",
        schoolId: "s1",
        user: { id: "u1" },
        membership: { id: "m1", schoolId: "s1", role: "TEACHER" },
        params: { draftId: "draft-1" },
        body: { draftText: "" },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await editDraft(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
    });

    it("should reject PARENT access via next", async () => {
      const mockDraft = { id: "draft-1", schoolId: "s1", alertId: "a1", userId: "u1", alert: { classId: "c1" }, language: "en", draftText: "Old text", status: "DRAFT" };
      prisma.parentCommunicationDraft.findFirst.mockResolvedValue(mockDraft);
      const next = vi.fn();
      const req = { role: "PARENT", schoolId: "s1", user: { id: "u1" }, params: { draftId: "draft-1" }, body: { draftText: "New text" } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await editDraft(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    });
  });

  describe("approveDraft", () => {
    it("should approve a DRAFT and set audit fields", async () => {
      const mockDraft = { id: "draft-1", schoolId: "s1", alertId: "a1", userId: "u1", alert: { classId: "c1" }, language: "en", draftText: "Text", status: "DRAFT" };
      prisma.parentCommunicationDraft.findFirst.mockResolvedValue(mockDraft);
      prisma.parentCommunicationDraft.update.mockResolvedValue({
        id: "draft-1",
        schoolId: "s1",
        alertId: "a1",
        userId: "u1",
        language: "en",
        draftText: "Text",
        status: "APPROVED",
        approvedBy: "u1",
        approvedAt: new Date(),
      });
      const next = vi.fn();
      const req = {
        role: "TEACHER",
        schoolId: "s1",
        user: { id: "u1" },
        membership: { id: "m1", schoolId: "s1", role: "TEACHER" },
        params: { draftId: "draft-1" },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await approveDraft(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const callArgs = res.json.mock.calls[0][0];
      expect(callArgs.data.status).toBe("APPROVED");
      expect(callArgs.data.approvedBy).toBe("u1");
      expect(callArgs.data.approvedAt).toBeInstanceOf(Date);
    });

    it("should reject repeated approval via next", async () => {
      const mockDraft = { id: "draft-1", schoolId: "s1", alertId: "a1", userId: "u1", alert: { classId: "c1" }, language: "en", draftText: "Text", status: "APPROVED" };
      prisma.parentCommunicationDraft.findFirst.mockResolvedValue(mockDraft);
      const next = vi.fn();
      const req = {
        role: "TEACHER",
        schoolId: "s1",
        user: { id: "u1" },
        membership: { id: "m1", schoolId: "s1", role: "TEACHER" },
        params: { draftId: "draft-1" },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await approveDraft(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 409 }));
    });

    it("should reject PARENT access via next", async () => {
      const mockDraft = { id: "draft-1", schoolId: "s1", alertId: "a1", userId: "u1", alert: { classId: "c1" }, language: "en", draftText: "Text", status: "DRAFT" };
      prisma.parentCommunicationDraft.findFirst.mockResolvedValue(mockDraft);
      const next = vi.fn();
      const req = { role: "PARENT", schoolId: "s1", user: { id: "u1" }, params: { draftId: "draft-1" } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      await approveDraft(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    });
  });
});
