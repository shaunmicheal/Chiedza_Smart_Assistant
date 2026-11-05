import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { assessmentByClass, attendanceTrend } from '../../data/mock/dashboard'
import Panel from '../common/Panel'

export function AttendanceChart({
  data = attendanceTrend,
  title = 'Attendance trend',
  eyebrow = 'Attendance monitoring',
  ariaLabel = 'Demonstration attendance trend by month',
}) {
  return (
    <Panel eyebrow={eyebrow} title={title} className="panel-wide">
      <div className="chart-wrap" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ left: -24, right: 12, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="attendanceFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#174D3A" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#174D3A" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#DCE9DE" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#5B6B63', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#5B6B63', fontSize: 12 }} domain={[80, 100]} />
            <Tooltip />
            <Area type="monotone" dataKey="attendance" name="Attendance" stroke="#174D3A" strokeWidth={3} fill="url(#attendanceFill)" />
            <Area type="monotone" dataKey="target" name="Reference" stroke="#D8A64B" strokeWidth={2} fill="transparent" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

export function AssessmentChart({
  data = assessmentByClass,
  title = 'Assessment by class',
  eyebrow = 'Assessment progress',
  ariaLabel = 'Demonstration assessment averages by class',
}) {
  return (
    <Panel eyebrow={eyebrow} title={title}>
      <div className="chart-wrap small-chart" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#DCE9DE" vertical={false} />
            <XAxis dataKey="group" tickLine={false} axisLine={false} tick={{ fill: '#5B6B63', fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#5B6B63', fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="score" name="Assessment average" fill="#174D3A" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}

export function PerformanceTrendChart({ data }) {
  return (
    <Panel eyebrow="Assessment history" title="Performance trend">
      <div className="chart-wrap" role="img" aria-label="Demonstration assessment performance over time">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#DCE9DE" vertical={false} />
            <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} tick={{ fill: '#5B6B63', fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#5B6B63', fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="average" name="Class average" stroke="#174D3A" strokeWidth={3} dot={{ fill: '#D8A64B', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
