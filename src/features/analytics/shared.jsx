import Select from '../../components/Select'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../lib/api'
import { compact, money, today } from '../../lib/format'
export function useAnalytics() {
  const [days, setDays] = useState('30')
  const end = today(),
    startDate = new Date(`${end}T12:00:00`)
  startDate.setDate(startDate.getDate() - Number(days) + 1)
  const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
  const query = useQuery({
    queryKey: ['analytics', start, end],
    queryFn: () => api(`analytics/?start=${start}&end=${end}`),
    refetchInterval: 30000,
  })
  const selector = (
    <div className="date-select">
      <CalendarDays size={16} />
      <Select
        aria-label="Analytics date range"
        value={days}
        onChange={(e) => setDays(e.target.value)}
      >
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last 12 months</option>
      </Select>
    </div>
  )
  return { ...query, selector }
}
export function RevenueChart({ data }) {
  return (
    <div className="revenue-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data.map((d) => ({ ...d, revenue: Number(d.revenue), profit: Number(d.profit) }))}
          margin={{ top: 12, left: -17, right: 8, bottom: 2 }}
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--green)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--green)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            minTickGap={45}
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            }
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted)' }}
            tickFormatter={(v) => compact(v)}
          />
          <Tooltip
            formatter={(v) => money(v)}
            labelFormatter={(v) =>
              new Date(String(v)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
            }
            contentStyle={{
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              borderRadius: 12,
              fontSize: 12,
              boxShadow: 'var(--shadow)',
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--green)"
            strokeWidth={2.5}
            fill="url(#revenueFill)"
          />
          <Area
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke="var(--chart-secondary)"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
