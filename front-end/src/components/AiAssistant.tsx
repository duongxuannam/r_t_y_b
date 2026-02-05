import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { Button } from './ui/button'
import { Input } from './ui/input'
import { t } from '../lib/i18n'
import { cn } from '../lib/utils'
import { api } from '../services/api'
import { appState, languageActions, themeActions } from '../state/appState'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

type ActionResult = {
  action: 'none' | 'create' | 'status' | 'theme' | 'language' | 'help'
  status?: 'todo' | 'in_progress' | 'done'
  theme?: 'light' | 'dark'
  language?: 'en' | 'vi'
  title?: string
}

const STATUS_KEYWORDS: Array<{ value: 'todo' | 'in_progress' | 'done'; keywords: string[] }> = [
  { value: 'done', keywords: ['done', 'hoàn thành', 'xong', 'complete', 'completed'] },
  { value: 'in_progress', keywords: ['in progress', 'in_progress', 'đang làm', 'đang tiến hành'] },
  { value: 'todo', keywords: ['todo', 'to-do', 'cần làm', 'backlog'] },
]

const THEME_KEYWORDS: Array<{ value: 'light' | 'dark'; keywords: string[] }> = [
  { value: 'dark', keywords: ['dark', 'dark mode', 'tối', 'ban đêm'] },
  { value: 'light', keywords: ['light', 'sáng', 'ban ngày'] },
]

const LANGUAGE_KEYWORDS: Array<{ value: 'en' | 'vi'; keywords: string[] }> = [
  { value: 'vi', keywords: ['tiếng việt', 'vietnamese', 'vi'] },
  { value: 'en', keywords: ['tiếng anh', 'english', 'en'] },
]

const HELP_KEYWORDS = ['help', 'hướng dẫn', 'guide', 'giúp', 'trợ giúp', 'làm gì']

const normalizeText = (value: string) => value.toLowerCase().trim()

const extractQuotedTitle = (value: string) => {
  const match = value.match(/["“”'](.+?)["“”']/)
  return match?.[1]?.trim()
}

const extractTitleFromCommand = (value: string) => {
  const match = value.match(/(?:todo|task)\s+(.+?)\s+(?:sang|to)\s+/)
  return match?.[1]?.trim()
}

const detectStatus = (value: string) => {
  const normalized = normalizeText(value)
  return STATUS_KEYWORDS.find((status) =>
    status.keywords.some((keyword) => normalized.includes(keyword)),
  )?.value
}

const detectTheme = (value: string) => {
  const normalized = normalizeText(value)
  return THEME_KEYWORDS.find((theme) =>
    theme.keywords.some((keyword) => normalized.includes(keyword)),
  )?.value
}

const detectLanguage = (value: string) => {
  const normalized = normalizeText(value)
  return LANGUAGE_KEYWORDS.find((language) =>
    language.keywords.some((keyword) => normalized.includes(keyword)),
  )?.value
}

const detectHelpIntent = (value: string) => {
  const normalized = normalizeText(value)
  return HELP_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

const detectCreateIntent = (value: string) =>
  /(?:tạo|thêm|create|add)\s+todo/.test(normalizeText(value))

const detectStatusIntent = (value: string) =>
  /(?:chuyển|đổi|move|set)\s+/.test(normalizeText(value))

const extractCreateTitle = (value: string) => {
  const match = value.match(/(?:tạo|thêm|create|add)\s+todo[:\s-]+(.+)/i)
  return match?.[1]?.trim()
}

const buildActionResult = (value: string): ActionResult => {
  if (detectHelpIntent(value)) {
    return { action: 'help' }
  }

  const theme = detectTheme(value)
  if (theme) {
    return { action: 'theme', theme }
  }

  const language = detectLanguage(value)
  if (language) {
    return { action: 'language', language }
  }

  if (detectCreateIntent(value)) {
    const title = extractCreateTitle(value)
    return { action: 'create', title }
  }

  if (detectStatusIntent(value)) {
    const status = detectStatus(value)
    const quotedTitle = extractQuotedTitle(value)
    const inlineTitle = extractTitleFromCommand(value)
    return { action: 'status', status, title: quotedTitle ?? inlineTitle }
  }

  return { action: 'none' }
}

const getAssistantCopy = (language: 'en' | 'vi') => {
  if (language === 'vi') {
    return {
      greeting: 'Xin chào! Tôi có thể tạo todo, đổi trạng thái, bật dark mode hoặc đổi ngôn ngữ cho bạn.',
      help: 'Bạn có thể nhắn: “Tạo todo: Học Rust”, “Chuyển todo "Học Rust" sang done”, “Bật dark mode”, “Chuyển sang tiếng Việt”.',
      missingTitle: 'Bạn muốn cập nhật todo nào? Hãy đặt tiêu đề trong dấu ngoặc kép.',
      missingStatus: 'Bạn muốn đổi sang trạng thái nào? (todo, in_progress, done)',
      notAuthed: 'Bạn cần đăng nhập để mình thao tác với todo.',
      created: (title: string) => `Đã tạo todo: ${title}.`,
      statusUpdated: (title: string, status: string) => `Đã cập nhật “${title}” sang ${status}.`,
      notFound: 'Không tìm thấy todo phù hợp. Hãy kiểm tra lại tiêu đề nhé.',
      multiFound: 'Có nhiều todo trùng tiêu đề. Hãy gửi tiêu đề chính xác hơn.',
      themeUpdated: (theme: string) => `Đã chuyển giao diện sang ${theme === 'dark' ? 'tối' : 'sáng'}.`,
      languageUpdated: (languageId: string) =>
        `Đã chuyển ngôn ngữ sang ${languageId === 'vi' ? 'Tiếng Việt' : 'English'}.`,
      fallback: 'Mình chưa hiểu. Bạn có thể nhắn “Hướng dẫn” để xem các lệnh hỗ trợ.',
    }
  }

  return {
    greeting: 'Hi! I can create todos, update statuses, toggle dark mode, or switch languages for you.',
    help: 'Try: “Create todo: Learn Rust”, “Move todo "Learn Rust" to done”, “Enable dark mode”, “Switch to English”.',
    missingTitle: 'Which todo should I update? Please wrap the title in quotes.',
    missingStatus: 'Which status should I move it to? (todo, in_progress, done)',
    notAuthed: 'Please log in so I can manage your todos.',
    created: (title: string) => `Created todo: ${title}.`,
    statusUpdated: (title: string, status: string) => `Updated “${title}” to ${status}.`,
    notFound: 'I could not find a matching todo. Please check the title.',
    multiFound: 'Multiple todos matched. Please send a more specific title.',
    themeUpdated: (theme: string) => `Switched to ${theme === 'dark' ? 'dark' : 'light'} mode.`,
    languageUpdated: (languageId: string) =>
      `Switched to ${languageId === 'vi' ? 'Vietnamese' : 'English'}.`,
    fallback: 'I did not catch that. Send “Help” to see available commands.',
  }
}

const AiAssistant = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const language = appState.language.get()
  const copy = useMemo(() => getAssistantCopy(language), [language])

  useEffect(() => {
    setMessages((prev) =>
      prev.length
        ? prev
        : [
            {
              id: 'assistant-greeting',
              role: 'assistant',
              content: copy.greeting,
            },
          ],
    )
  }, [copy.greeting])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const pushMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message])
  }

  const handleAction = async (value: string) => {
    const result = buildActionResult(value)
    const accessToken = appState.auth.accessToken.get()

    if (result.action === 'help') {
      pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: copy.help })
      return
    }

    if (result.action === 'theme' && result.theme) {
      themeActions.setTheme(result.theme)
      pushMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: copy.themeUpdated(result.theme),
      })
      return
    }

    if (result.action === 'language' && result.language) {
      languageActions.setLanguage(result.language)
      pushMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: copy.languageUpdated(result.language),
      })
      return
    }

    if (result.action === 'create') {
      if (!accessToken) {
        pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: copy.notAuthed })
        return
      }
      if (!result.title) {
        pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: copy.missingTitle })
        return
      }
      const todo = await api.createTodo({ title: result.title })
      pushMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: copy.created(todo.title),
      })
      return
    }

    if (result.action === 'status') {
      if (!accessToken) {
        pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: copy.notAuthed })
        return
      }
      if (!result.title) {
        pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: copy.missingTitle })
        return
      }
      if (!result.status) {
        pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: copy.missingStatus })
        return
      }
      const todos = await api.listTodos()
      const matching = todos.filter((todo) =>
        todo.title.toLowerCase().includes(result.title!.toLowerCase()),
      )
      if (!matching.length) {
        pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: copy.notFound })
        return
      }
      if (matching.length > 1) {
        pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: copy.multiFound })
        return
      }
      const target = matching[0]
      await api.updateTodo(target.id, { status: result.status })
      pushMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: copy.statusUpdated(target.title, result.status),
      })
      return
    }

    pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: copy.fallback })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isWorking) return

    setInput('')
    pushMessage({ id: crypto.randomUUID(), role: 'user', content: trimmed })
    setIsWorking(true)
    try {
      await handleAction(trimmed)
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.fallback
      pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: message })
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="w-[min(92vw,380px)] overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{t('assistant.title')}</p>
              <p className="text-xs text-muted-foreground">{t('assistant.subtitle')}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {t('assistant.close')}
            </Button>
          </div>
          <div ref={listRef} className="max-h-[320px] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border/70 px-4 py-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('assistant.placeholder')}
              aria-label={t('assistant.placeholder')}
              disabled={isWorking}
            />
            <Button type="submit" size="sm" disabled={isWorking || !input.trim()}>
              {t('assistant.send')}
            </Button>
          </form>
        </div>
      ) : null}
      <Button
        type="button"
        className="h-12 rounded-full px-5 shadow-lg"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? t('assistant.hide') : t('assistant.open')}
      </Button>
    </div>
  )
}

export default AiAssistant
