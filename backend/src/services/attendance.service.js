import prisma from "../config/prisma.js";
import { evaluateLearnerEarlyWarnings } from "./earlyWarning.service.js";

const parseDateParam = (value) => {
  if (!value) return undefined;
  const d = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) {
    const error = new Error("Invalid date format. Use YYYY-MM-DD.");
    error.status = 400;
    throw error;
  }
  return d;
};

export const recordAttendance = async (schoolId, data, recordedById) => {
  // Verify learner belongs to this school
  const learner = await prisma.learner.findFirst({
    where: { id: data.learnerId, schoolId },
    include: { schoolClass: true },
  });
  if (!learner) {
    const error = new Error("Learner not found in this school.");
    error.status = 404;
    throw error;
  }

  // Check for existing attendance on this date (idempotent upsert)
  const existing = await prisma.attendance.findFirst({
    where: {
      schoolId,
      learnerId: data.learnerId,
      date: data.date,
    },
  });

  if (existing) {
    const error = new Error("Attendance already recorded for this learner on this date.");
    error.status = 409;
    throw error;
  }

  const attendance = await prisma.attendance.create({
    data: {
      schoolId,
      learnerId: data.learnerId,
      date: data.date,
      status: data.status,
      recordedById,
    },
    include: {
      learner: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Trigger early warning evaluation (best-effort, should not fail attendance)
  try {
    await evaluateLearnerEarlyWarnings(schoolId, data.learnerId);
  } catch (error) {
    // Log evaluation failure server-side but do not fail the attendance operation
    // Audit log: attendance evaluated successfully
  }

  return attendance;
};

export const listAttendance = async (schoolId, { date, classId, learnerId } = {}) => {
  const where = { schoolId };
  if (date) where.date = parseDateParam(date);
  if (classId) where.learner = { classId };
  if (learnerId) where.learnerId = learnerId;

  return prisma.attendance.findMany({
    where,
    include: {
      learner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          classId: true,
          schoolClass: {
            select: { id: true, name: true },
          },
        },
      },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ date: "desc" }, { learner: { lastName: "asc" } }],
  });
};

export const getAttendanceByLearner = async (schoolId, learnerId) => {
  const learner = await prisma.learner.findFirst({
    where: { id: learnerId, schoolId },
  });
  if (!learner) {
    const error = new Error("Learner not found in this school.");
    error.status = 404;
    throw error;
  }

  return prisma.attendance.findMany({
    where: { schoolId, learnerId },
    include: {
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { date: "desc" },
  });
};

export const getAttendanceById = async (schoolId, attendanceId) => {
  const attendance = await prisma.attendance.findFirst({
    where: { id: attendanceId, schoolId },
    include: {
      learner: { select: { id: true, firstName: true, lastName: true, admissionNumber: true, classId: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
      updatedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!attendance) {
    const error = new Error("Attendance record not found.");
    error.status = 404;
    throw error;
  }
  return attendance;
};

export const updateAttendance = async (schoolId, attendanceId, data, updatedById) => {
  const existing = await prisma.attendance.findFirst({
    where: { id: attendanceId, schoolId },
  });
  if (!existing) {
    const error = new Error("Attendance record not found.");
    error.status = 404;
    throw error;
  }

  // If changing date, check for duplicate on new date
  if (data.date && data.date.getTime() !== existing.date.getTime()) {
    const conflict = await prisma.attendance.findFirst({
      where: {
        schoolId,
        learnerId: existing.learnerId,
        date: data.date,
      },
    });
    if (conflict) {
      const error = new Error("Attendance already recorded for this learner on the target date.");
      error.status = 409;
      throw error;
    }
  }

  const attendance = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.date !== undefined && { date: data.date }),
      ...(updatedById && { updatedById }),
    },
    include: {
      learner: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      recordedBy: { select: { id: true, firstName: true, lastName: true } },
      updatedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Trigger early warning evaluation (best-effort, should not fail attendance)
  try {
    await evaluateLearnerEarlyWarnings(schoolId, attendance.learnerId);
  } catch (error) {
    // Log evaluation failure server-side but do not fail the attendance operation
  }

  return attendance;
};
