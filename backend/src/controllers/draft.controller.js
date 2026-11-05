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

    // Build a concise prompt for OpenAI focusing on the core issues
    const learnerInfo = alert.learner
      ? { firstName: alert.learner.firstName, lastName: alert.learner.lastName }
      : null;

    // Construct minimal evidence summary – include applicable recorded evidence
    const evidenceSummaryParts = [];

    if (evidence.absencesCount !== undefined) {
      evidenceSummaryParts.push(`Absences: ${evidence.absencesCount}`);
    }

    if (evidence.absenceDateRange !== undefined) {
      evidenceSummaryParts.push(`Absence date range: ${evidence.absenceDateRange}`);
    }

    if (evidence.declineThreshold !== undefined) {
      evidenceSummaryParts.push(`Decline threshold: ${evidence.declineThreshold}`);
    }

    if (evidence.assessmentsCompared !== undefined) {
      evidenceSummaryParts.push(`Assessments compared: ${evidence.assessmentsCompared}`);
    }

    if (evidence.lastAssessmentDate !== undefined) {
      evidenceSummaryParts.push(`Last assessment date: ${evidence.lastAssessmentDate}`);
    }

    const evidenceSummary = evidenceSummaryParts.length > 0 ? evidenceSummaryParts.join(", ") : null;

    // Build the OpenAI prompt – minimise personal data
    const prompt = `You are writing a parent-facing message about an early warning alert for a learner in Zimbabwe.

Alert type: ${alert.alertRule?.name || "unknown"}
Current status: ${alert.status}

Please write a supportive, professional message in ${language === "en" ? "English" : "Shona"} that:
- Explains the reason for the alert in a clear, constructive way
- Encourages parental partnership and support
- Uses appropriate tone for a Zimbabwean school context
- ${language === "sn" ? "Write naturally in standard Zimbabwean Shona. Do not use a word-for-word dictionary translation from English." : "Write in plain English. Do not translate to Shona."}

Keep the message concise (under 300 words). Do not invent fictitious learner data, causes, diagnoses, evidence, marks or trends. Use only the context provided above.

Evidence context: ${evidenceSummary || "No specific evidence recorded"}

Message:`;

// Check if OpenAI key is configured – do this before creating client
if (!process.env.OPENAI_API_KEY) {
  const error = new Error(
    "OpenAI API key not configured. Contact administrator to enable draft generation."
  );
  error.status = 500;
  throw error;
}

// Create OpenAI client (lazy – not at module import time, no module-level caching)
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.7,
});

const generatedText = completion.choices[0]?.message?.content || "";

if (!generatedText) {
  const error = new Error("Failed to generate draft text from OpenAI.");
  error.status = 500;
  throw error;
}

// The draft creator is the current user (teacher or school admin)
const userId = req.user.id;

// Upsert: if a DRAFT already exists for (school, alert, user, status=DRAFT), update it;
// otherwise create a new one.
const draft = await prisma.parentCommunicationDraft.upsert({
  where: {
    schoolId_alertId_userId_status: {
      schoolId: req.schoolId,
      alertId: alert.id,
      userId,
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
