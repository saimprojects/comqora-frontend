import { createContext, useContext, useEffect, useState } from 'react'
const ThemeContext = createContext(null)
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return (localStorage.getItem('comqora-theme') || localStorage.getItem('sellflow-theme')) ===
        'dark'
        ? 'dark'
        : 'light'
    } catch {
      return 'light'
    }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('sellflow-theme', theme)
      localStorage.setItem('comqora-theme', theme)
    } catch {
      /* Browser storage may be disabled. */
    }
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export function useTheme() {
  return useContext(ThemeContext)
}
