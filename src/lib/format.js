export const number = (n) =>
  new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Number(n) || 0)
export const money = (n) =>
  `Rs ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 }).format(Number(n) || 0)}`
export const compact = (n) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number(n) || 0,
  )
export const date = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
export const initials = (name) =>
  name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
