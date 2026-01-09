import { useMemo } from 'react';
import { themeActions } from '../state/appState';

type ThemeToggleProps = {
  options: { id: string; label: string; color: string }[]
  value: string
}

const ThemeToggle = ({ options, value }: ThemeToggleProps) => {
  const current = useMemo(
    () => options.find((option) => option.id === value) ?? options[0],
    [options, value],
  )

  const handleSelect = (id: string) => {
    themeActions.setTheme(id)
  }

  return (
    <div className="relative">
      <div className="inline-flex p-1 text-xs border-2 rounded-full shadow-sm border-border bg-background/90 sm:text-sm">
        {options.map((theme) => {
          const isActive = theme.id === current.id
          return (
            <button
              key={theme.id}
              type="button"
              className={`rounded-full px-3 py-1.5 font-medium transition sm:px-4 ${isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                }`}
              onClick={() => handleSelect(theme.id)}
            >
              {theme.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ThemeToggle
