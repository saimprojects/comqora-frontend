function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const datePresets = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['week', 'This week'],
  ['month', 'This month'],
  ['last_month', 'Last month'],
  ['custom', 'Custom dates'],
]
export function dateRange(preset, now = new Date()) {
  // Calendar boundaries follow the workspace's Pakistan timezone, not UTC midnight.
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [year, month, day] = today.split('-').map(Number)
  const start = new Date(year, month - 1, day, 12),
    end = new Date(start)
  if (preset === 'yesterday') {
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
  }
  if (preset === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  if (preset === 'month') start.setDate(1)
  if (preset === 'last_month') {
    start.setMonth(start.getMonth() - 1, 1)
    end.setDate(0)
  }
  return { start_date: iso(start), end_date: iso(end) }
}
