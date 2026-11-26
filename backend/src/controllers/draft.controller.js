import prisma from "../config/prisma.js";
import OpenAI from "openai";

// Helper: reject if role is PARENT
const rejectParent = (req) => {
  if (req.role === "PARENT") {
    const error = new Error("Parents cannot perform this action.");
    error.status = 403;
    throw error;
  }
};

// Helper: assert school access for a draft (SCHOOL_ADMIN or assigned teacher)
const assertDraftSchoolAccess = async (db, draft, req) => {
  if (req.role === "SCHOOL_ADMIN") {
    if (draft.schoolId !== req.schoolId) {
      const error = new Error("Cross-school access denied.");
      error.status = 403;
      throw error;
    }
    return;
  }

  // TEACHER: must be assigned to the class related to the draft's alert
  if (!req.membership?.id) {
    const error = new Error("No school membership found.");
    error.status = 403;
    throw error;
  }

  // Determine the classId from the draft's alert
  const classId = draft.alert?.classId || draft.alert?.learner?.classId;

  if (!classId) {
    const error = new Error("Cannot determine class from draft alert.");
    error.status = 403;
    throw error;
  }

  const assignment = await prisma.classTeacher.findFirst({
    where: {
      schoolId: req.schoolId,
      classId,
      membershipId: req.membership.id,
    },
    select: { id: true },
  });

  if (!assignment) {
    const error = new Error("You are not authorised to edit drafts for this class.");
    error.status = 403;
    throw error;
  }
};

// Helper: assert teacher is assigned to the alert's class (used by generateDraft)
const assertTeacherCanAccessAlert = async (db, alert, req) => {
  if (req.role === "SCHOOL_ADMIN") {
    return; // SCHOOL_ADMIN can access any alert in their school
  }

  if (req.role !== "TEACHER") {
    const error = new Error("You do not have permission to access this alert.");
    error.status = 403;
    throw error;
  }

  if (!req.membership?.id) {
    const error = new Error("No school membership found.");
    error.status = 403;
    throw error;
  }

  const classId = alert.classId || alert.learner?.classId;

  if (!classId) {
    const error = new Error("Teachers cannot access alerts without an assigned class.");
    error.status = 403;
    throw error;
  }

  const assignment = await prisma.classTeacher.findFirst({
    where: {
      schoolId: req.schoolId,
      classId,
      membershipId: req.membership.id,
    },
    select: { id: true },
  });

  if (!assignment) {
    const error = new Error("You are not authorised to access this class.");
    error.status = 403;
    throw error;
  }
};

/**
 * List drafts for a school.
 * SCHOOL_ADMIN: list all drafts in the school.
 * TEACHER: list only drafts associated with alerts in classes assigned to the teacher.
 * PARENT: denied.
 */
export const listDrafts = async (req, res, next) => {
  try {
    rejectParent(req);

    if (req.role === "SCHOOL_ADMIN") {
      const drafts = await prisma.parentCommunicationDraft.findMany({
        where: { schoolId: req.schoolId },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          alert: {
            include: {
              learner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  classId: true,
                },
              },
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({
        success: true,
        count: drafts.length,
        data: drafts,
      });
    }

    // TEACHER: list drafts for alerts in classes assigned to this teacher
    const assignedClassIds = await prisma.classTeacher.findMany({
      where: {
        schoolId: req.schoolId,
        membershipId: req.membership.id,
      },
      select: { classId: true },
    });

    const assignedClassIdSet = new Set(
      assignedClassIds.map((a) => a.classId)
    );

    if (assignedClassIdSet.size === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const drafts = await prisma.parentCommunicationDraft.findMany({
      where: {
        schoolId: req.schoolId,
        alert: {
          classId: { in: Array.from(assignedClassIdSet) },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        alert: {
          include: {
            learner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                classId: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: drafts.length,
      data: drafts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a draft from an alert.
 * Body: { alertId, language }
 * - SCHOOL_ADMIN: any alert in their school
 * - TEACHER: must be assigned to the alert's class
 * - PARENT: denied
 * Saves as DRAFT; updates existing DRAFT if one already exists for same (school, alert, user).
 */
export const generateDraft = async (req, res, next) => {
  try {
    const { alertId, language } = req.body;

    // Validate language
    if (!language || !(language === "en" || language === "sn")) {
      const error = new Error('Language must be "en" or "sn".');
      error.status = 400;
      throw error;
    }

    rejectParent(req);

    // Retrieve the alert, scoped to the school
    const alert = await prisma.earlyWarningAlert.findFirst({
      where: {
        id: alertId,
        schoolId: req.schoolId,
      },
      include: {
        learner: {
          select: { id: true, firstName: true, lastName: true, classId: true },
        },
        class: {
          select: { id: true, name: true },
        },
        alertRule: {
          select: { id: true, name: true, alertType: true, config: true },
        },
      },
    });

    if (!alert) {
      const error = new Error("Alert not found in this school.");
      error.status = 404;
      throw error;
    }

    // Check teacher authorisation
    if (req.role === "TEACHER") {
      if (!req.membership?.id) {
        const error = new Error("No school membership found.");
        error.status = 403;
        throw error;
      }
      const classId = alert.classId || alert.learner?.classId;
      if (!classId) {
        const error = new Error("Teachers cannot access alerts without an assigned class.");
        error.status = 403;
        throw error;
      }
      const assignment = await prisma.classTeacher.findFirst({
        where: {
          schoolId: req.schoolId,
          classId,
          membershipId: req.membership.id,
        },
        select: { id: true },
      });
      if (!assignment) {
        const error = new Error("You are not authorised to access this class.");
        error.status = 403;
        throw error;
      }
    }
    // SCHOOL_ADMIN passes through no additional check

    // Retrieve only the evidence needed to explain the alert
    const evidence = alert.evidence || {};

    // Build a concise prompt for Gemini focusing on the core issues
    // Build a structured, allowlisted evidence summary.
    // The alert service stores absenceCount inside evidence and also exposes
    // absencesCount as a top-level alert field.
    const evidenceContext = {};

    if (alert.alertType === "REPEATED_ABSENCES") {
      const absenceCount = evidence.absenceCount ?? alert.absencesCount;
      const absenceThreshold =
        evidence.threshold ?? alert.alertRule?.config?.absenceThreshold;
      const observationPeriodDays = evidence.observationPeriodDays;

      if (absenceCount !== undefined && absenceCount !== null) {
        evidenceContext.absenceCount = absenceCount;
      }
      if (absenceThreshold !== undefined && absenceThreshold !== null) {
        evidenceContext.absenceThreshold = absenceThreshold;
      }
      if (
        observationPeriodDays !== undefined &&
        observationPeriodDays !== null
      ) {
        evidenceContext.observationPeriodDays = observationPeriodDays;
      }
    }

    if (alert.alertType === "ACADEMIC_DECLINE") {
      const assessmentsCompared =
        evidence.assessmentsCompared ?? alert.assessmentsCompared;
      const declineThreshold =
        evidence.declineThreshold ?? alert.declineThreshold;

      if (assessmentsCompared !== undefined && assessmentsCompared !== null) {
        evidenceContext.assessmentsCompared = assessmentsCompared;
      }
      if (declineThreshold !== undefined && declineThreshold !== null) {
        evidenceContext.declineThreshold = declineThreshold;
      }
      // Send percentages only. Keep assessment titles, dates and raw marks
      // inside Chiedza rather than forwarding individual records to Gemini.
      const firstPercentage = evidence.firstAssessment?.percentage;
      const lastPercentage = evidence.lastAssessment?.percentage;

      if (
        typeof firstPercentage === "number" &&
        Number.isFinite(firstPercentage)
      ) {
        evidenceContext.firstAssessmentPercentage = firstPercentage;
      }
      if (
        typeof lastPercentage === "number" &&
        Number.isFinite(lastPercentage)
      ) {
        evidenceContext.lastAssessmentPercentage = lastPercentage;
      }
    }

    const evidenceSummary =
      Object.keys(evidenceContext).length > 0
        ? JSON.stringify(evidenceContext)
        : null;

    // Keep personal data out of the AI request. Supply only recorded evidence.
    const prompt = `You write parent-facing school communication for a Zimbabwean school.

Alert type: ${alert.alertRule?.name || alert.alertType || "unknown"}
Alert status: ${alert.status}
Language required: ${language === "en" ? "English" : "Zimbabwean Shona"}

Write one supportive, professional message to a parent or guardian.
- Explain the recorded reason for the alert clearly and constructively.
- Encourage partnership between the family and school.
- Use a respectful, reassuring tone appropriate for a Zimbabwean school.
- ${
      language === "sn"
        ? "Write natural, fluent Zimbabwean Shona. Do not translate English word-for-word. Use clear language suitable for a parent or guardian."
        : "Write clear, plain English suitable for a parent or guardian."
    }
- Use only the evidence supplied below. Do not invent names, dates, causes, diagnoses, marks, attendance records or trends.
- Do not claim that the learner has a medical, developmental or psychological condition.
- Do not exaggerate the risk or blame the learner or family.
- If evidence is incomplete, explain only what is known and recommend speaking with the school.
- Keep the message under 200 words.
- Return only the message, without a heading, language label or explanation.

Recorded evidence (JSON):
${evidenceSummary || "No specific evidence was recorded for this alert."}

Parent message:`;

// Check if Gemini key is configured before creating the client
if (!process.env.GEMINI_API_KEY) {
  const error = new Error(
    "Gemini API key not configured. Contact administrator to enable draft generation."
  );
  error.status = 500;
  throw error;
}

// Create Gemini-compatible client lazily, without module-level caching
const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const completion = await client.chat.completions.create({
  model: "gemini-3.5-flash-lite",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.7,
});

const generatedText = completion.choices[0]?.message?.content || "";

if (!generatedText) {
  const error = new Error("Failed to generate draft text from Gemini.");
  error.status = 500;
  throw error;
}

// The draft creator is the current user (teacher or school admin)
const userId = req.user.id;

// Upsert: if a DRAFT already exists for (school, alert, user, status=DRAFT), update it;
// otherwise create a new one.
const draft = await prisma.parentCommunicationDraft.upsert({
  where: {
    schoolId_alertId_userId_language_status: {
      schoolId: req.schoolId,
      alertId: alert.id,
      userId,
      language,
      status: "DRAFT",
    },
  },
  update: {
    draftText: generatedText,
    language,
    evidenceSummary: evidenceSummary || undefined,
    status: "DRAFT",
  },
  create: {
    schoolId: req.schoolId,
    alertId: alert.id,
    userId,
    language,
    draftText: generatedText,
    evidenceSummary: evidenceSummary || null,
    status: "DRAFT",
  },
  include: {
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    },
    alert: {
      include: {
        learner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classId: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  },
  });

return res.status(201).json({
  success: true,
  data: draft,
});
  } catch (error) {
    next(error);
  }
};

/**
 * Edit an existing draft.
 * - Draft creator may edit their own draft.
 * - SCHOOL_ADMIN may edit any draft in their school.
 * - PARENT: denied.
 * - Editing an APPROVED draft is denied with 409.
 * - Only drafts with status DRAFT may be edited.
 * - Verify teacher class assignment via assertDraftSchoolAccess.
 */
export const editDraft = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const { draftText } = req.body;

    rejectParent(req);

    const db = prisma;

    // Find the draft, scoped to school
    const draft = await prisma.parentCommunicationDraft.findFirst({
      where: {
        id: draftId,
        schoolId: req.schoolId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        alert: {
          include: {
            learner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                classId: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!draft) {
      const error = new Error("Draft not found.");
      error.status = 404;
      throw error;
    }

    // Check authorisation: creator or SCHOOL_ADMIN
    // Creator retains access ONLY if still assigned to the draft's class.
    const isCreator = draft.userId === req.user.id;
    const isAdmin = req.role === "SCHOOL_ADMIN";

    if (!isCreator && !isAdmin) {
      const error = new Error("You are not authorised to edit this draft.");
      error.status = 403;
      throw error;
    }

    // A teacher who created the draft but is no longer assigned to its class
    // must not retain edit access.
    if (isCreator && req.role === "TEACHER") {
      // Verify teacher is still assigned to the draft's class
      const classId = draft.alert?.classId || draft.alert?.learner?.classId;
      if (classId) {
        const assignment = await prisma.classTeacher.findFirst({
          where: {
            schoolId: req.schoolId,
            classId,
            membershipId: req.membership.id,
          },
          select: { id: true },
        });
        if (!assignment) {
          // Teacher no longer assigned - lose edit access
          if (!isAdmin) {
            const error = new Error("You are not authorised to edit this draft.");
            error.status = 403;
            throw error;
          }
        }
      }
    }

    // Reject editing APPROVED drafts
    if (draft.status === "APPROVED") {
      const error = new Error("Cannot edit an approved draft.");
      error.status = 409;
      throw error;
    }

    // Only drafts with status DRAFT may be edited
    if (draft.status !== "DRAFT") {
      const error = new Error("Only drafts with status DRAFT may be edited.");
      error.status = 400;
      throw error;
    }

    // Validate that the edited message is not empty
    if (!draftText || draftText.trim().length === 0) {
      const error = new Error("Draft text must not be empty.");
      error.status = 400;
      throw error;
    }

    // Assert school access (SCHOOL_ADMIN or assigned teacher)
    await assertDraftSchoolAccess(db, draft, req);

    // Update the draft
    const updated = await prisma.parentCommunicationDraft.update({
      where: { id: draftId },
      data: {
        draftText,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a draft.
 * - Verifies school access, teacher class assignment and draft ownership.
 * - Only approves a DRAFT (not already APPROVED).
 * - Sets status: "APPROVED", approvedBy, approvedAt.
 * - Rejects repeated approval with 409.
 * - Approval must NOT send or deliver a message.
 */
export const approveDraft = async (req, res, next) => {
  try {
    const { draftId } = req.params;

    rejectParent(req);

    const db = prisma;

    // Find the draft, scoped to school
    const draft = await prisma.parentCommunicationDraft.findFirst({
      where: {
        id: draftId,
        schoolId: req.schoolId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        alert: {
          include: {
            learner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                classId: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!draft) {
      const error = new Error("Draft not found.");
      error.status = 404;
      throw error;
    }

    // Check authorisation: creator or SCHOOL_ADMIN in the school
    const isCreator = draft.userId === req.user.id;
    const isAdmin = req.role === "SCHOOL_ADMIN";

    if (!isCreator && !isAdmin) {
      const error = new Error("You are not authorised to approve this draft.");
      error.status = 403;
      throw error;
    }

    // Assert school access (SCHOOL_ADMIN or assigned teacher)
    await assertDraftSchoolAccess(db, draft, req);

    // Reject if already APPROVED
    if (draft.status === "APPROVED") {
      const error = new Error("This draft has already been approved.");
      error.status = 409;
      throw error;
    }

    // Approve the draft
    const now = new Date();
    const approved = await prisma.parentCommunicationDraft.update({
      where: { id: draftId },
      data: {
        status: "APPROVED",
        approvedBy: req.user.id,
        approvedAt: now,
      },
    });

    return res.status(200).json({
      success: true,
      data: approved,
    });
  } catch (error) {
    next(error);
  }
}
