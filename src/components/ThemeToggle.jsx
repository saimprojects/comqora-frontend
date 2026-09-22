import { Moon, Sun } from 'lucide-react'
import { useTheme } from './Theme'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      className="icon-button theme-toggle"
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
