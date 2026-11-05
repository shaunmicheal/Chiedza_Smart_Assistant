import { demoAlerts, demoLearners, initialAssessments, initialCommunications } from './operations'

export const DEMO_DATA_NOTICE =
  'Demonstration data only — figures and names shown here are not live school records.'

const recordedScores = initialAssessments.flatMap((assessment) =>
  assessment.results.map((result) => ({ score: Number(result.score), maximum: assessment.maximum })),
)
const overallAssessmentAverage = Math.round(
  (recordedScores.reduce((total, result) => total + result.score / result.maximum * 100, 0) / recordedScores.length) || 0,
)
const schoolAttendanceAverage = Math.round(
  demoLearners.reduce((total, learner) => total + Number.parseInt(learner.attendance, 10), 0) / demoLearners.length,
)

export const dashboardStats = [
  { label: 'Total learners', value: String(demoLearners.length), change: 'Demo total', tone: 'positive', icon: 'learners' },
  { label: 'Attendance rate', value: `${schoolAttendanceAverage}%`, change: 'Demo rate', tone: 'positive', icon: 'attendance' },
  { label: 'Assessment average', value: `${overallAssessmentAverage}%`, change: 'Demo average', tone: 'positive', icon: 'assessment' },
  {
    label: 'Active early warnings',
    value: String(demoAlerts.filter((alert) => alert.status === 'Active').length),
    change: 'Demo count',
    tone: 'warning',
    icon: 'risk',
  },
]

export const attendanceTrend = [
  { month: 'Jan', attendance: 88, target: 90 },
  { month: 'Feb', attendance: 90, target: 91 },
  { month: 'Mar', attendance: 92, target: 92 },
  { month: 'Apr', attendance: 94, target: 93 },
  { month: 'May', attendance: 96, target: 94 },
  { month: 'Jun', attendance: 93, target: 95 },
  { month: 'Jul', attendance: 95, target: 95 },
]

export const assessmentByClass = [
  ...new Set(initialAssessments.map((assessment) => assessment.className)),
].map((className) => {
  const classAssessments = initialAssessments.filter((assessment) => assessment.className === className)
  const results = classAssessments.flatMap((assessment) =>
    assessment.results.map((result) => ({ score: Number(result.score), maximum: assessment.maximum })),
  )
  return {
    group: className,
    score: Math.round(results.reduce((total, result) => total + result.score / result.maximum * 100, 0) / results.length),
  }
})

export const riskLearners = demoAlerts
  .filter((alert) => alert.status !== 'Resolved')
  .map((alert) => ({
    name: alert.learner,
    className: alert.className,
    risk: alert.type,
    priority: alert.severity === 'high' ? 'High' : 'Medium',
  }))

export const recentAlerts = demoAlerts
  .slice()
  .filter((alert) => alert.status === 'Active')
  .sort((left, right) => right.detected.localeCompare(left.detected))
  .slice(0, 3)
  .map((alert) => ({
    id: alert.id,
    title: alert.type,
    detail: `${alert.className} · ${alert.evidence}`,
    level: alert.severity === 'high' ? 'urgent' : alert.severity === 'medium' ? 'warning' : 'info',
    time: alert.detected,
  }))

export const parentMessages = initialCommunications.map((message) => ({
  id: message.id,
  name: demoLearners.find((learner) => learner.id === message.learnerId)?.guardian ?? 'Demo family',
  status: message.status,
  tone: ['Approved', 'Delivered'].includes(message.status) ? 'positive' : 'warning',
}))

export const recentActivity = [
  { title: 'Attendance entries reviewed', detail: 'Example activity · Grade 4A', time: 'Demo' },
  { title: 'Assessment progress recorded', detail: 'Example activity · Grade 5B', time: 'Demo' },
  { title: 'Parent message prepared', detail: 'Example activity · English and Shona', time: 'Demo' },
]
