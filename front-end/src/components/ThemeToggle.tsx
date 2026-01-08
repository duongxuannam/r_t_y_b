import { useEffect, useRef, useState } from 'react'
import { themeActions } from '../state/appState'

type ThemeToggleProps = {
  options: { id: string; label: string; color: string }[]
  value: string
}

const ThemeToggle = ({ options, value }: ThemeToggleProps) => {
  const current = options.find((option) => option.id === value) ?? options[0]
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const handleSelect = (id: string) => {
    themeActions.setTheme(id)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="btn btn-sm btn-outline bg-base-200 px-3 py-2 text-base-content shadow-sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-base-300 bg-base-100">
            <span
              className={`h-3 w-3 rounded-full ${
                current.id === 'light' ? 'bg-base-content/40' : ''
              }`}
              style={current.id === 'light' ? undefined : { backgroundColor: current.color }}
            />
          </span>
          <span>{current.label}</span>
          <svg
            className="h-4 w-4 opacity-70"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-base-200 bg-base-100 p-2 text-base-content shadow-lg"
          onMouseDown={(event) => event.preventDefault()}
        >
          {options.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-base-content transition hover:bg-base-200"
              onClick={() => handleSelect(theme.id)}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-base-300 bg-base-100">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: theme.color }}
                />
              </span>
              <span>{theme.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ThemeToggle
