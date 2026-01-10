import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { MESSAGE_EVENT, messageBus, type MessagePayload } from './message'

export const MessageHost = () => {
  const [items, setItems] = useState<Array<MessagePayload & { state: 'enter' | 'exit' }>>([])
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const lastPositions = useRef(new Map<string, number>())

  const iconMap = useMemo(
    () => ({
      success: <CheckCircle2 className="mt-0.5 h-4 w-4" />,
      error: <AlertCircle className="mt-0.5 h-4 w-4" />,
      warning: <AlertTriangle className="mt-0.5 h-4 w-4" />,
    }),
    [],
  )

  useEffect(() => {
    const handler = (event: Event) => {
      const payload = (event as CustomEvent<MessagePayload>).detail
      setItems((prev) => [...prev, { ...payload, state: 'enter' }])

      const exitDelay = Math.max(200, payload.duration - 200)
      window.setTimeout(() => {
        setItems((prev) =>
          prev.map((item) => (item.id === payload.id ? { ...item, state: 'exit' } : item)),
        )
      }, exitDelay)
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== payload.id))
      }, payload.duration)
    }

    messageBus.addEventListener(MESSAGE_EVENT, handler)
    return () => messageBus.removeEventListener(MESSAGE_EVENT, handler)
  }, [])

  useLayoutEffect(() => {
    const nextPositions = new Map<string, number>()
    itemRefs.current.forEach((node, id) => {
      if (node) {
        nextPositions.set(id, node.getBoundingClientRect().top)
      }
    })

    lastPositions.current.forEach((prevTop, id) => {
      const node = itemRefs.current.get(id)
      const nextTop = nextPositions.get(id)
      if (!node || nextTop === undefined) return
      const delta = prevTop - nextTop
      if (delta !== 0) {
        node.style.transition = 'none'
        node.style.transform = `translateY(${delta}px)`
        requestAnimationFrame(() => {
          node.style.transition = ''
          node.style.transform = ''
        })
      }
    })

    lastPositions.current = nextPositions
  }, [items])

  if (items.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none fixed left-1/2 top-8 z-[1000] flex w-auto max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center gap-2 sm:top-4">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          ref={(node) => {
            if (node) {
              itemRefs.current.set(item.id, node)
            } else {
              itemRefs.current.delete(item.id)
            }
          }}
          className={cn(
            'message-item glass-panel pointer-events-auto inline-flex max-w-[calc(100%-1rem+50px)] select-text items-start gap-2 rounded-2xl border bg-card/95 p-3 text-sm shadow-lg',
            item.type === 'success' && 'border-success/30 text-success',
            item.type === 'error' && 'border-destructive/30 text-destructive',
            item.type === 'warning' && 'border-warning/30 text-warning',
            item.state === 'enter' ? 'message-enter' : 'message-exit',
          )}
        >
          {iconMap[item.type]}
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  )
}
