export const teacherOverviewStats = [
  { label: 'Assigned learners', value: '62', change: 'Demo total', tone: 'positive', icon: 'learners' },
  { label: 'Present today', value: '58 / 62', change: 'Demo count', tone: 'positive', icon: 'attendance' },
  { label: 'Learners to review', value: '3', change: 'Demo count', tone: 'warning', icon: 'risk' },
]

export const teacherAssignedClasses = [
  { name: 'Grade 4A', learners: 32, note: 'Assigned class · demo' },
  { name: 'Grade 5B', learners: 30, note: 'Assigned class · demo' },
]

export const teacherAttendanceTrend = [
  { month: 'Jan', attendance: 91, target: 92 },
  { month: 'Feb', attendance: 93, target: 92 },
  { month: 'Mar', attendance: 90, target: 92 },
  { month: 'Apr', attendance: 94, target: 92 },
  { month: 'May', attendance: 92, target: 92 },
  { month: 'Jun', attendance: 95, target: 92 },
]

export const teacherLearnersNeedingAttention = [
  { name: 'Netsai M.', className: 'Grade 4A', risk: 'Repeated absences', priority: 'High' },
  { name: 'Takunda S.', className: 'Grade 5B', risk: 'Declining marks', priority: 'Medium' },
  { name: 'Anesu P.', className: 'Grade 4A', risk: 'Repeated absences', priority: 'Medium' },
]

export const recentAssessmentActivity = [
  { subject: 'Mathematics', className: 'Grade 4A', activity: 'Example assessment recorded', time: 'Demo' },
  { subject: 'Reading', className: 'Grade 5B', activity: 'Example progress reviewed', time: 'Demo' },
  { subject: 'English', className: 'Grade 4A', activity: 'Example assessment recorded', time: 'Demo' },
]

export const pendingParentDrafts = [
  { language: 'English', className: 'Grade 4A', status: 'Draft · demo' },
  { language: 'Shona', className: 'Grade 5B', status: 'Draft · demo' },
]
