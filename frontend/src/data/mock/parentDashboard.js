import { demoLearners, initialAssessments } from './operations'

const linkedChildId = 'l-002'
const linkedLearner = demoLearners.find((learner) => learner.id === linkedChildId)
const attendanceDaysPresent = 48
const attendanceDaysAbsent = 2

export const linkedChildDemo = {
  initials: 'KM',
  id: linkedLearner.id,
  name: linkedLearner.name,
  className: linkedLearner.className,
  relation: 'Linked child · demonstration only',
  attendanceDaysPresent,
  attendanceDaysAbsent,
}

export const linkedChildAttendanceRate = `${Math.round(
  attendanceDaysPresent / (attendanceDaysPresent + attendanceDaysAbsent) * 100,
)}%`

export const linkedChildAttendanceTrend = [
  { month: 'Jan', attendance: 95, target: 90 },
  { month: 'Feb', attendance: 96, target: 90 },
  { month: 'Mar', attendance: 94, target: 90 },
  { month: 'Apr', attendance: 97, target: 90 },
  { month: 'May', attendance: 96, target: 90 },
  { month: 'Jun', attendance: 96, target: 90 },
]

export const linkedChildAssessments = ['Mathematics', 'Reading', 'English'].map((subject) => {
  const assessment = initialAssessments.find((item) =>
    item.className === linkedLearner.className && item.subject === subject)
  const result = assessment?.results.find((item) => item.learnerId === linkedChildId)
  return {
    group: subject,
    score: Math.round((Number(result?.score) / assessment.maximum) * 100),
  }
})

const academicAverage = Math.round(
  linkedChildAssessments.reduce((total, result) => total + result.score, 0) / linkedChildAssessments.length,
)

export const parentOverviewStats = [
  { label: 'Attendance', value: linkedChildAttendanceRate, change: 'Demo summary', tone: 'positive', icon: 'attendance' },
  { label: 'Assessment average', value: `${academicAverage}%`, change: 'Demo summary', tone: 'positive', icon: 'assessment' },
]

export const parentSchoolMessages = [
  {
    title: 'A note about regular attendance',
    english: 'Please encourage regular attendance this week.',
    shona: 'Tinokumbirawo kuti mwana apinde chikoro nguva dzose vhiki rino.',
    time: 'Demo message',
  },
  {
    title: 'Learning progress check-in',
    english: 'Please contact the school if you would like to discuss learning progress.',
    shona: 'Ndapota taurai nechikoro kana muchida kukurukura nezvekufambira mberi pakudzidza.',
    time: 'Demo message',
  },
]

export const parentNotifications = [
  {
    title: 'Attendance update',
    detail: 'A demonstration attendance summary is available for your linked child.',
    level: 'info',
    time: 'Demo',
  },
  {
    title: 'School message',
    detail: 'A bilingual demonstration message is ready to review.',
    level: 'warning',
    time: 'Demo',
  },
]
