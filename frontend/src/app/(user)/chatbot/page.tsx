'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Sparkles, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { chatbot } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const isSubmitting = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isSubmitting.current) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    isSubmitting.current = true

    try {
      const response: any = await chatbot.chat(userMessage.content)

      const botContent =
        response.response ||
        response.message ||
        response.content ||
        'I received your message, but the server returned an empty response.'

      const botMessage: Message = {
        role: 'assistant',
        content: botContent,
      }
      setMessages((prev) => [...prev, botMessage])
    } catch (error: any) {
      console.error('Chatbot Error:', error)
      const errorMessage =
        error?.response?.data?.detail || error?.message || 'Failed to connect to the AI service.'
      toast.error(errorMessage)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `**Error:** ${errorMessage}`,
        },
      ])
    } finally {
      setLoading(false)
      isSubmitting.current = false
    }
  }

  // Helper to convert standard LaTeX delimiters to what remark-math expects
  const preprocessLaTeX = (content: string) => {
    return content
      .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$') // Replace \[ ... \] with $$ ... $$
      .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$') // Replace \( ... \) with $ ... $
  }

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/80 shadow-2xl shadow-indigo-100 backdrop-blur-xl">
      {/* Sticky Header with Gradient Icon */}
      <div className="sticky top-0 z-20 border-b border-indigo-50 bg-white/90 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-lg ring-1 shadow-purple-500/25 ring-white/50">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl leading-none font-bold tracking-tight text-slate-900">
              Jemih AI
            </h1>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              <p className="text-xs font-medium text-slate-500">Online & Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 space-y-6 overflow-y-auto scroll-smooth p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <div className="mb-4 rounded-full border border-indigo-50 bg-gradient-to-b from-indigo-50 to-white p-6 shadow-sm">
              <Bot className="h-12 w-12 text-indigo-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-700">How can I help you today?</h3>
            <p className="mt-2 max-w-xs text-sm text-slate-500">
              I can analyze defect rates, summarize run history, or explain model performance
              metrics.
            </p>

            <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => setInput('Show me the defect rate for today')}
                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-3 text-left text-xs transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <Zap className="h-4 w-4 text-amber-500" /> Defect rate today?
              </button>
              <button
                onClick={() => setInput('Which model is performing best?')}
                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-3 text-left text-xs transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <Zap className="h-4 w-4 text-indigo-500" /> Best performing model?
              </button>
            </div>
          </div>
        )}

        {messages.map((m, index) => (
          <div
            key={index}
            className={`flex w-full gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`flex max-w-[80%] flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`px-5 py-3.5 text-sm shadow-sm ${
                  m.role === 'user'
                    ? 'rounded-2xl rounded-tr-sm bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
                    : 'rounded-2xl rounded-tl-sm border border-slate-100 bg-white text-slate-700 shadow-slate-200/50'
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed break-words">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {preprocessLaTeX(m.content)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {m.role === 'user' && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-slate-100 bg-white px-5 py-4 text-sm shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-fuchsia-600" />
              <span className="text-xs font-medium text-slate-400">Jemih is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-100 bg-white/50 p-4 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="relative mx-auto flex max-w-4xl gap-3"
        >
          <Input
            className="h-12 rounded-xl border-slate-200 bg-white pr-12 pl-4 text-sm shadow-sm transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="icon"
            className="absolute top-1.5 right-1.5 h-9 w-9 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-200 transition-all hover:scale-105 hover:bg-indigo-700"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </form>
      </div>
    </div>
  )
}
