import prisma from "../config/prisma.js";

const alertInclude = {
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
  alertRule: {
    select: {
      id: true,
      name: true,
      alertType: true,
      config: true,
    },
  },
};

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const getRuleDefaults = (alertType) => {
  if (alertType === "REPEATED_ABSENCES") {
    return {
      absenceThreshold: 3,
      observationPeriodDays: 5,
    };
  }

  return {
    minAssessments: 3,
    declinePercentage: 20,
  };
};

// Check whether the current user can access an alert.
const assertAlertAccess = async (db, req, alert) => {
  if (req.role === "SCHOOL_ADMIN") {
    return;
  }

  if (req.role !== "TEACHER") {
    throw createError("You do not have permission to access this alert.", 403);
  }

  const membershipId = req.membership?.id;

  if (!membershipId) {
    throw createError("No school membership found.", 403);
  }

  const classId = alert.classId || alert.learner?.classId;

  if (!classId) {
    throw createError(
      "Teachers cannot access alerts without an assigned class.",
      403,
    );
  }

  const assignment = await db.classTeacher.findFirst({
    where: {
      schoolId: req.schoolId,
      classId,
      membershipId,
    },
    select: {
      id: true,
    },
  });

  if (!assignment) {
    throw createError("You are not authorised to access this class.", 403);
  }
};

// Get classes assigned to a teacher.
const getTeacherClassIds = async (db, req) => {
  if (!req.membership?.id) {
    throw createError("No school membership found.", 403);
  }

  const assignments = await db.classTeacher.findMany({
    where: {
      schoolId: req.schoolId,
      membershipId: req.membership.id,
    },
    select: {
      classId: true,
    },
  });

  return assignments.map((assignment) => assignment.classId);
};

// Create or update an alert rule.
export const createAlertRule = async (req, res, next) => {
  try {
    const { name, alertType, config } = req.body;
    const schoolId = req.schoolId;

    const finalConfig = {
      ...getRuleDefaults(alertType),
      ...(config || {}),
    };

    const alertRule = await prisma.alertRule.upsert({
      where: {
        schoolId_name: {
          schoolId,
          name,
        },
      },
      update: {
        alertType,
        config: finalConfig,
        isActive: true,
      },
      create: {
        schoolId,
        name,
        alertType,
        config: finalConfig,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: alertRule,
    });
  } catch (error) {
    next(error);
  }
};

// List alert rules belonging to the current school.
export const listAlertRules = async (req, res, next) => {
  try {
    const rules = await prisma.alertRule.findMany({
      where: {
        schoolId: req.schoolId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
};

// Update an existing school alert rule.
export const updateAlertRule = async (req, res, next) => {
  try {
    const { ruleId } = req.params;
    const { alertType, config, isActive } = req.body;

    const existingRule = await prisma.alertRule.findFirst({
      where: {
        id: ruleId,
        schoolId: req.schoolId,
      },
    });

    if (!existingRule) {
      throw createError("Alert rule not found.", 404);
    }

    const updatedRule = await prisma.alertRule.update({
      where: {
        id: ruleId,
        schoolId: req.schoolId,
      },
      data: {
        ...(alertType !== undefined && { alertType }),
        ...(config !== undefined && {
          config: {
            ...(existingRule.config || {}),
            ...config,
          },
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.status(200).json({
      success: true,
      data: updatedRule,
    });
  } catch (error) {
    next(error);
  }
};

// Deactivate a rule without deleting its historical alerts.
export const deleteAlertRule = async (req, res, next) => {
  try {
    const result = await prisma.alertRule.updateMany({
      where: {
        id: req.params.ruleId,
        schoolId: req.schoolId,
      },
      data: {
        isActive: false,
      },
    });

    if (result.count === 0) {
      throw createError("Alert rule not found.", 404);
    }

    res.status(200).json({
      success: true,
      message: "Alert rule deactivated.",
    });
  } catch (error) {
    next(error);
  }
};

// List alerts with school and teacher class restrictions.
export const listAlerts = async (req, res, next) => {
  try {
    const { alertType, learnerId, classId, status } =
      req.validated?.query || req.query;

    const where = {
      schoolId: req.schoolId,
      ...(alertType && { alertType }),
      ...(learnerId && { learnerId }),
      ...(classId && { classId }),
      ...(status && { status }),
    };

    if (req.role === "TEACHER") {
      const assignedClassIds = await getTeacherClassIds(prisma, req);

      if (classId && !assignedClassIds.includes(classId)) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }

      where.classId = {
        in: classId ? [classId] : assignedClassIds,
      };
    }

    if (req.role !== "SCHOOL_ADMIN") {
      throw createError("You do not have permission to view alerts.", 403);
    }

    const alerts = await prisma.earlyWarningAlert.findMany({
      where,
      include: alertInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
};

// Dedicated class alert endpoint.
export const listClassAlerts = async (req, res, next) => {
  return listAlerts(req, res, next);
};

// Get a single alert and its status history.
export const getAlertDetail = async (req, res, next) => {
  try {
    const alert = await prisma.earlyWarningAlert.findFirst({
      where: {
        id: req.params.alertId,
        schoolId: req.schoolId,
      },
      include: {
        ...alertInclude,
        alertStatusHistories: {
          orderBy: {
            changedAt: "asc",
          },
        },
      },
    });

    if (!alert) {
      throw createError("Alert not found.", 404);
    }

    await assertAlertAccess(prisma, req, alert);

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

// Shared transactional status transition.
const changeAlertStatus = async (req, alertId, targetStatus, changedBy) => {
  return prisma.$transaction(async (tx) => {
    const alert = await tx.earlyWarningAlert.findFirst({
      where: {
        id: alertId,
        schoolId: req.schoolId,
      },
      include: alertInclude,
    });

    if (!alert) {
      throw createError("Alert not found.", 404);
    }

    await assertAlertAccess(tx, req, alert);

    const allowedStatuses =
      targetStatus === "ACKNOWLEDGED" ? ["ACTIVE"] : ["ACTIVE", "ACKNOWLEDGED"];

    if (!allowedStatuses.includes(alert.status)) {
      throw createError(
        `This alert cannot be ${targetStatus.toLowerCase()}. Its current status is ${alert.status}.`,
        409,
      );
    }

    const now = new Date();

    const updateData =
      targetStatus === "ACKNOWLEDGED"
        ? {
            status: "ACKNOWLEDGED",
            acknowledgedBy: changedBy,
            acknowledgedAt: now,
          }
        : {
            status: "RESOLVED",
            resolvedBy: changedBy,
            resolvedAt: now,
          };

    const updateResult = await tx.earlyWarningAlert.updateMany({
      where: {
        id: alertId,
        schoolId: req.schoolId,
        status: alert.status,
      },
      data: updateData,
    });

    if (updateResult.count !== 1) {
      throw createError(
        "The alert was changed by another request. Refresh and try again.",
        409,
      );
    }

    await tx.alertStatusHistory.create({
      data: {
        alertId: alert.id,
        schoolId: req.schoolId,
        fromStatus: alert.status,
        toStatus: targetStatus,
        changedBy,
      },
    });

    return tx.earlyWarningAlert.findFirst({
      where: {
        id: alertId,
        schoolId: req.schoolId,
      },
      include: {
        ...alertInclude,
        alertStatusHistories: {
          orderBy: {
            changedAt: "asc",
          },
        },
      },
    });
  });
};

// Acknowledge an active alert.
export const acknowledgeAlert = async (req, res, next) => {
  try {
    const updatedAlert = await changeAlertStatus(
      req,
      req.params.alertId,
      "ACKNOWLEDGED",
      req.user.id,
    );

    res.status(200).json({
      success: true,
      data: updatedAlert,
    });
  } catch (error) {
    next(error);
  }
};

// Resolve an active or acknowledged alert.
export const resolveAlert = async (req, res, next) => {
  try {
    const updatedAlert = await changeAlertStatus(
      req,
      req.params.alertId,
      "RESOLVED",
      req.user.id,
    );

    res.status(200).json({
      success: true,
      data: updatedAlert,
    });
  } catch (error) {
    next(error);
  }
};
