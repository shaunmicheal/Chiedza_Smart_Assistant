export const teacherOverviewStats = [
  { label: 'Assigned learners', value: '8', change: 'Demo total', tone: 'positive', icon: 'learners' },
  { label: 'Present today', value: '4 / 8', change: 'Demo count', tone: 'positive', icon: 'attendance' },
  { label: 'Learners to review', value: '3', change: 'Demo count', tone: 'warning', icon: 'risk' },
]

export const teacherAssignedClasses = [
  { name: 'Grade 4A', learners: 4, note: 'Assigned class · demo' },
  { name: 'Grade 5B', learners: 4, note: 'Assigned class · demo' },
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
  { name: 'Ropafadzo Ncube', className: 'Grade 4A', risk: 'Repeated absences', priority: 'High' },
  { name: 'Nyasha Dube', className: 'Grade 5B', risk: 'Declining marks', priority: 'Medium' },
  { name: 'Tafadzwa Sibanda', className: 'Grade 5B', risk: 'Repeated absences', priority: 'High' },
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
