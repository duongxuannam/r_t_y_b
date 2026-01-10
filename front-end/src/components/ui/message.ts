type MessageType = 'success' | 'error' | 'warning'
type MessagePayload = {
  id: string
  type: MessageType
  text: string
  duration: number
}

const MESSAGE_EVENT = 'app-message'
const messageBus = new EventTarget()

const emitMessage = (type: MessageType, text: string, duration = 3000) => {
  const payload: MessagePayload = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    text,
    duration,
  }
  messageBus.dispatchEvent(new CustomEvent(MESSAGE_EVENT, { detail: payload }))
}

export const message = {
  success: (text: string, duration?: number) => emitMessage('success', text, duration),
  error: (text: string, duration?: number) => emitMessage('error', text, duration),
  warning: (text: string, duration?: number) => emitMessage('warning', text, duration),
}

export { messageBus, MESSAGE_EVENT }
export type { MessagePayload, MessageType }
