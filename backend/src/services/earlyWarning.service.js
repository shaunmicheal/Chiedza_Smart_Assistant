import prisma from "../config/prisma.js";
import { getLearnerAssessments } from "./assessmentQuery.service.js";

async function handleP2002Error(error, schoolId, learnerId, alertRuleId, alertType) {
  // Prisma P2002 code: P2002
  if (error.code !== 'P2002') {
    throw error
  }
  // Attempt to retrieve the existing alert that caused the constraint violation
  const existingAlert = await prisma.earlyWarningAlert.findFirst({
    where: {
      schoolId,
      learnerId: learnerId || undefined,
      alertRuleId: alertRuleId || undefined,
      alertType,
      status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
    }
  })
  if (existingAlert) {
    return {
      success: false,
      isDuplicate: true,
      alert: existingAlert
    }
  }
  // If no existing alert found despite P2002, re-throw
  throw error
}

async function checkRepeatedAbsences(schoolId, learnerId, days = 5, absenceThreshold = 3, periodType = "schoolDays", acknowledgedRuleId) {
  const attendanceRecords = await prisma.attendance.findMany({
    where: { schoolId, learnerId },
    orderBy: { date: "asc" },
  })

  if (attendanceRecords.length < days) {
    return null
  }

  const absences = attendanceRecords.filter(
    (record) => record.status === "ABSENT" || record.status === "EXCUSED"
  )

  if (absences.length < absenceThreshold) {
    return null
  }

  const sortedDates = [...new Set(attendanceRecords.map((r) => r.date))].sort((a, b) => new Date(a) - new Date(b))
  let absenceCount = absences.length
  let dateRangeStart
  let dateRangeEnd

  if (periodType === "calendarDays") {
    dateRangeEnd = new Date(sortedDates[sortedDates.length - 1])
    const calendarCutoff = new Date(dateRangeEnd.getTime() - days * 24 * 60 * 60 * 1000)
    dateRangeStart = calendarCutoff
    absenceCount = absences.filter((a) => new Date(a.date) >= calendarCutoff).length
  } else {
    const recentRecords = attendanceRecords.slice(-days)
    absenceCount = recentRecords.filter(
      (record) => record.status === "ABSENT" || record.status === "EXCUSED"
    ).length
    dateRangeEnd = new Date(recentRecords[recentRecords.length - 1].date)
    dateRangeStart = new Date(recentRecords[0].date)
  }

  if (absenceCount < absenceThreshold) {
    return null
  }

  try {
    const existingAlert = await prisma.earlyWarningAlert.findFirst({
      where: {
        schoolId, learnerId, alertType: "REPEATED_ABSENCES", status: "ACTIVE",
        ...(acknowledgedRuleId && { alertRuleId: acknowledgedRuleId })
      }
    })

    if (existingAlert) {
      return { duplicate: true, alert: existingAlert }
    }
  } catch (error) {
    if (error.code === 'P2002') {
      // Duplicate alert via database constraint
      const retrieverrorscope = schoolId
      const attemptRetrieve = await prisma.earlyWarningAlert.findFirst({
        where: {
          schoolId,
          learnerId: learnerId || undefined,
          alertType: 'REPEATED_ABSENCES',
          status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
        }
      })
      if (attemptRetrieve) {
        return { duplicate: true, alert: attemptRetrieve }
      }
    }
    throw error
  }

  return {
    type: "REPEATED_ABSENCES",
    absenceCount,
    dateRangeStart: dateRangeStart ? dateRangeStart.toISOString().split("T")[0] : null,
    dateRangeEnd: dateRangeEnd ? dateRangeEnd.toISOString().split("T")[0] : null,
    threshold: absenceThreshold,
    observationPeriodDays: days,
  }
}

async function checkAcademicDecline(schoolId, learnerId, minAssessments = 3, declinePercentage = 20, acknowledgedRuleId) {
  const learnerAssessments = await getLearnerAssessments(schoolId, learnerId)

  if (learnerAssessments.length < minAssessments) {
    return null
  }

  const recentAssessments = learnerAssessments.slice(0, minAssessments)

  const scoresWithPercentage = recentAssessments.map((result) => {
    const assessment = result.assessment
    const percentage = (result.score / assessment.maxScore) * 100
    return {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      date: assessment.date,
      score: result.score,
      maxScore: assessment.maxScore,
      percentage
    }
  })

  scoresWithPercentage.sort((a, b) => new Date(a.date) - new Date(b.date))

  const firstScore = scoresWithPercentage[0]
  const lastScore = scoresWithPercentage[scoresWithPercentage.length - 1]

  let declineFound = false
  let declineDetails = null

  if (firstScore.percentage > 0 && lastScore.percentage > 0) {
    const decline = firstScore.percentage - lastScore.percentage
    if (decline >= declinePercentage) {
      declineFound = true
      declineDetails = {
        firstAssessment: {
          title: firstScore.assessmentTitle,
          date: firstScore.date,
          score: firstScore.score,
          maxScore: firstScore.maxScore,
          percentage: Math.round(firstScore.percentage)
        },
        lastAssessment: {
          title: lastScore.assessmentTitle,
          date: lastScore.date,
          score: lastScore.score,
          maxScore: lastScore.maxScore,
          percentage: Math.round(lastScore.percentage)
        },
        declinePercentage: Math.round(decline)
      }
    }
  }

  if (!declineFound && scoresWithPercentage.length >= 2) {
    let totalDecline = 0
    let declineCount = 0

    for (let i = 1; i < scoresWithPercentage.length; i++) {
      const prev = scoresWithPercentage[i - 1]
      const curr = scoresWithPercentage[i]
      const drop = prev.percentage - curr.percentage
      if (drop > 0) {
        totalDecline += drop
        declineCount++
      }
    }

    if (declineCount >= Math.ceil(scoresWithPercentage.length / 2) && totalDecline >= declinePercentage) {
      declineFound = true
      const first = scoresWithPercentage[0]
      const last = scoresWithPercentage[scoresWithPercentage.length - 1]
      declineDetails = {
        firstAssessment: {
          title: first.assessmentTitle,
          date: first.date,
          score: first.score,
          maxScore: first.maxScore,
          percentage: Math.round(first.percentage)
        },
        lastAssessment: {
          title: last.assessmentTitle,
          date: last.date,
          score: last.score,
          maxScore: last.maxScore,
          percentage: Math.round(last.percentage)
        },
        declinePercentage: Math.round(totalDecline / declineCount),
        assessmentsCompared: scoresWithPercentage.length
      }
    }
  }

  if (!declineFound) {
    return null
  }

  try {
    const existingAlert = await prisma.earlyWarningAlert.findFirst({
      where: {
        schoolId, learnerId, alertType: "ACADEMIC_DECLINE", status: "ACTIVE",
        ...(acknowledgedRuleId && { alertRuleId: acknowledgedRuleId })
      }
    })

    if (existingAlert) {
      return { duplicate: true, alert: existingAlert }
    }
  } catch (error) {
    if (error.code === 'P2002') {
      // Duplicate alert via database constraint
      const attemptRetrieve = await prisma.earlyWarningAlert.findFirst({
        where: {
          schoolId,
          learnerId: learnerId || undefined,
          alertType: 'ACADEMIC_DECLINE',
          status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
        }
      })
      if (attemptRetrieve) {
        return { duplicate: true, alert: attemptRetrieve }
      }
    }
    throw error
  }

  return {
    type: "ACADEMIC_DECLINE",
    assessmentsCompared: scoresWithPercentage.length,
    declineThreshold: declinePercentage,
    firstAssessment: {
      title: declineDetails.firstAssessment.title,
      date: declineDetails.firstAssessment.date,
      score: declineDetails.firstAssessment.score,
      maxScore: declineDetails.firstAssessment.maxScore,
      percentage: declineDetails.firstAssessment.percentage
    },
    lastAssessment: {
      title: declineDetails.lastAssessment.title,
      date: declineDetails.lastAssessment.date,
      score: declineDetails.lastAssessment.score,
      maxScore: declineDetails.lastAssessment.maxScore,
      percentage: declineDetails.lastAssessment.percentage
    }
  }
}




async function evaluateLearnerEarlyWarnings(schoolId, learnerId) {
  // Verify the learner belongs to the school
  const learner = await prisma.learner.findFirst({
    where: { schoolId, id: learnerId },
    select: { id: true, classId: true },
  });

  if (!learner) {
    return null;
  }

  // Load active alert rules for this school
  const alertRules = await prisma.alertRule.findMany({
    where: { schoolId, isActive: true },
    orderBy: { id: 'asc' },
  });

  if (!alertRules.length) {
    return null;
  }

  // Get the learner's classId
  const classId = learner.classId;

  const createdAlerts = [];

  for (const rule of alertRules) {
    const config = rule.config || {};

    // Prevent duplicate unresolved alert for this specific rule
    const existingAlert = await prisma.earlyWarningAlert.findFirst({
      where: {
        schoolId,
        learnerId,
        alertRuleId: rule.id,
        status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
      },
    });

    if (existingAlert) {
      continue;
    }

    // Process REPEATED_ABSENCES
    if (rule.alertType === 'REPEATED_ABSENCES') {
      const absenceThreshold = config.absenceThreshold ?? 3;
      const observationPeriodDays = config.observationPeriodDays ?? 5;

      const attendanceRecords = await prisma.attendance.findMany({
        where: { schoolId, learnerId },
        orderBy: { date: 'asc' },
      });

      if (attendanceRecords.length < absenceThreshold) {
        continue;
      }

      const absences = attendanceRecords.filter(
        (record) => record.status === 'ABSENT' || record.status === 'EXCUSED'
      );

      if (absences.length < absenceThreshold) {
        continue;
      }

      const sortedDates = [...new Set(attendanceRecords.map((r) => r.date))].sort((a, b) => new Date(a) - new Date(b));
      let absenceCount = absences.length;
      let dateRangeStart;
      let dateRangeEnd;

      if (config.periodType === 'calendarDays') {
        dateRangeEnd = new Date(sortedDates[sortedDates.length - 1]);
        const calendarCutoff = new Date(dateRangeEnd.getTime() - observationPeriodDays * 24 * 60 * 60 * 1000);
        dateRangeStart = calendarCutoff;
        absenceCount = absences.filter((a) => new Date(a.date) >= calendarCutoff).length;
      } else {
        const recentRecords = attendanceRecords.slice(-observationPeriodDays);
        absenceCount = recentRecords.filter(
          (record) => record.status === 'ABSENT' || record.status === 'EXCUSED'
        ).length;
        dateRangeEnd = new Date(recentRecords[recentRecords.length - 1].date);
        dateRangeStart = new Date(recentRecords[0].date);
      }

      if (absenceCount < absenceThreshold) {
        continue;
      }

      try {
        const newAlert = await prisma.earlyWarningAlert.create({
          data: {
            schoolId,
            learnerId,
            classId,
            alertType: 'REPEATED_ABSENCES',
            status: 'ACTIVE',
            alertRuleId: rule.id,
            absencesCount: absenceCount,
            absenceDateRange: dateRangeStart ? dateRangeStart.toISOString().split('T')[0] : null,
            declineThreshold: null,
            assessmentsCompared: null,
            lastAssessmentDate: null,
            evidence: {
              absenceCount,
              absenceDateRange: dateRangeStart ? dateRangeStart.toISOString() : null,
              dateRangeEnd: dateRangeEnd ? dateRangeEnd.toISOString() : null,
              threshold: absenceThreshold,
              observationPeriodDays,
            },
          },
        });
        createdAlerts.push(newAlert);
      } catch (error) {
        if (error.code === 'P2002') {
          const recovered = await prisma.earlyWarningAlert.findFirst({
            where: {
              schoolId,
              learnerId,
              alertRuleId: rule.id,
              status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
            },
          });
          if (recovered) {
            createdAlerts.push(recovered);
            continue;
          }
        }
        console.error('[EarlyWarning] REPEATED_ABSENCES alert failed for school ' + schoolId + ', learner ' + learnerId + ', rule ' + rule.id + ': ' + error.message);
        throw error;
      }
    }

    if (rule.alertType === 'ACADEMIC_DECLINE') {
      const minAssessments = config.minAssessments ?? 3;
      const declinePercentage = config.declinePercentage ?? 20;

      const learnerAssessments = await getLearnerAssessments(schoolId, learnerId);

      if (learnerAssessments.length < minAssessments) {
        continue;
      }

      const recentAssessments = learnerAssessments.slice(0, minAssessments);

      const scoresWithPercentage = recentAssessments.map((result) => {
        const assessment = result.assessment;
        const percentage = assessment.maxScore > 0 ? (result.score / assessment.maxScore) * 100 : 0;
        return {
          assessmentId: assessment.id,
          assessmentTitle: assessment.title,
          date: assessment.date,
          score: result.score,
          maxScore: assessment.maxScore,
          percentage,
        };
      }).sort((a, b) => new Date(a.date) - new Date(b.date));

      if (scoresWithPercentage.length < 2) {
        continue;
      }

      const firstScore = scoresWithPercentage[0];
      const lastScore = scoresWithPercentage[scoresWithPercentage.length - 1];

      let declineFound = false;
      let declineDetails = null;

      if (firstScore.percentage > 0 && lastScore.percentage > 0) {
        const decline = firstScore.percentage - lastScore.percentage;
        if (decline >= declinePercentage) {
          declineFound = true;
          declineDetails = {
            firstAssessment: {
              title: firstScore.assessmentTitle,
              date: firstScore.date,
              score: firstScore.score,
              maxScore: firstScore.maxScore,
              percentage: Math.round(firstScore.percentage),
            },
            lastAssessment: {
              title: lastScore.assessmentTitle,
              date: lastScore.date,
              score: lastScore.score,
              maxScore: lastScore.maxScore,
              percentage: Math.round(lastScore.percentage),
            },
            declinePercentage: Math.round(firstScore.percentage - lastScore.percentage),
          };
        }
      }

      if (!declineFound) {
        continue;
      }

      try {
        const newAlert = await prisma.earlyWarningAlert.create({
          data: {
            schoolId,
            learnerId,
            classId,
            alertType: 'ACADEMIC_DECLINE',
            status: 'ACTIVE',
            alertRuleId: rule.id,
            absencesCount: null,
            absenceDateRange: null,
            declineThreshold: String(declinePercentage),
            assessmentsCompared: scoresWithPercentage.length,
            lastAssessmentDate: lastScore.date,
            evidence: {
              assessmentsCompared: scoresWithPercentage.length,
              declineThreshold: declinePercentage,
              firstAssessment: declineDetails.firstAssessment,
              lastAssessment: declineDetails.lastAssessment,
            },
          },
        });
        createdAlerts.push(newAlert);
      } catch (error) {
        if (error.code === 'P2002') {
          const recovered = await prisma.earlyWarningAlert.findFirst({
            where: {
              schoolId,
              learnerId,
              alertRuleId: rule.id,
              status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
            },
          });
          if (recovered) {
            createdAlerts.push(recovered);
            continue;
          }
        }
        console.error('[EarlyWarning] ACADEMIC_DECLINE alert failed for school ' + schoolId + ', learner ' + learnerId + ', rule ' + rule.id + ': ' + error.message);
        throw error;
      }
    }
  }

  return createdAlerts.length ? createdAlerts : null;
}

export { checkRepeatedAbsences, checkAcademicDecline, evaluateLearnerEarlyWarnings };
