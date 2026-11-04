export const DEMO_DATA_NOTICE =
  'Demonstration data only — figures and names shown here are not live school records.'

export const dashboardStats = [
  { label: 'Attendance rate', value: '94.8%', change: '+2.1%', tone: 'positive', icon: 'attendance' },
  { label: 'Learners at risk', value: '17', change: '-4 this week', tone: 'warning', icon: 'risk' },
  { label: 'Assessment average', value: '76.4%', change: '+5.3%', tone: 'positive', icon: 'assessment' },
  { label: 'Parent replies', value: '83%', change: '+9%', tone: 'positive', icon: 'messages' },
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
  { group: 'Lower primary', score: 79 },
  { group: 'Grade 3', score: 84 },
  { group: 'Grade 4', score: 77 },
  { group: 'Grade 5', score: 71 },
  { group: 'Grade 6', score: 68 },
  { group: 'Grade 7', score: 82 },
]

export const riskLearners = [
  { name: 'Netsai M.', className: 'Grade 4A', risk: 'Attendance and marks', priority: 'High' },
  { name: 'Takunda S.', className: 'Grade 5B', risk: 'Repeated absences', priority: 'Medium' },
  { name: 'Anesu P.', className: 'Grade 3A', risk: 'Declining marks', priority: 'High' },
  { name: 'Makanaka G.', className: 'Grade 6C', risk: 'Repeated absences', priority: 'Medium' },
]

export const recentAlerts = [
  {
    title: 'Repeated absences',
    detail: 'Review the demonstration attendance pattern for Grade 4A.',
    level: 'urgent',
    time: 'Demo',
  },
  {
    title: 'Declining marks',
    detail: 'Review the demonstration assessment pattern for Grade 5B.',
    level: 'warning',
    time: 'Demo',
  },
  {
    title: 'Parent message follow-up',
    detail: 'Example parent messages are available in English and Shona.',
    level: 'info',
    time: 'Demo',
  },
]

export const parentMessages = [
  { name: 'Mujuru family', status: 'Reply sent', tone: 'positive' },
  { name: 'Mapuranga family', status: 'Awaiting reply', tone: 'warning' },
  { name: 'Gororo family', status: 'Reviewed', tone: 'positive' },
]
