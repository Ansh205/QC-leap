'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Sparkles, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Simulate API response
      setTimeout(() => {
        const botMessage: Message = { 
            role: 'assistant', 
            content: "I've analyzed the latest **production run**. \n\nIt looks like the defect rate has dropped by **12%** compared to last week. The most common issue remains *surface scratching* on the Q4 batch." 
        }
        setMessages((prev) => [...prev, botMessage])
        setLoading(false)
      }, 1000)

    } catch (error) {
      toast.error('Failed to send message')
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col bg-white/80 backdrop-blur-xl rounded-2xl border border-white/40 shadow-2xl shadow-indigo-100 overflow-hidden">
      
      {/* Sticky Header with Gradient Icon */}
      <div className="sticky top-0 z-20 border-b border-indigo-50 bg-white/90 backdrop-blur-md px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-purple-500/25 ring-1 ring-white/50">
             <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">Jemih AI</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <p className="text-xs font-medium text-slate-500">Online & Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
        {messages.length === 0 && (
           <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <div className="bg-gradient-to-b from-indigo-50 to-white p-6 rounded-full mb-4 border border-indigo-50 shadow-sm">
                  <Bot className="h-12 w-12 text-indigo-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-700">How can I help you today?</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-2">I can analyze defect rates, summarize run history, or explain model performance metrics.</p>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                  <button onClick={() => setInput("Show me the defect rate for today")} className="text-xs text-left p-3 rounded-lg border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" /> Defect rate today?
                  </button>
                  <button onClick={() => setInput("Which model is performing best?")} className="text-xs text-left p-3 rounded-lg border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all flex items-center gap-2">
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white shadow-sm mt-1">
                    <Bot className="h-4 w-4" />
                </div>
            )}

            <div
              className={`flex max-w-[80%] flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
                <div
                className={`px-5 py-3.5 text-sm shadow-sm ${
                    m.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-blue-500/20'
                    : 'bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm shadow-slate-200/50'
                }`}
                >
                <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                </div>
            </div>

            {m.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 mt-1">
                    <User className="h-4 w-4" />
                </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start gap-3">
             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white shadow-sm mt-1">
                <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-none bg-white border border-slate-100 px-5 py-4 text-sm shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-fuchsia-600" />
              <span className="text-slate-400 text-xs font-medium">Jemih is thinking...</span>
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
          className="flex gap-3 max-w-4xl mx-auto relative"
        >
            <Input 
              className="h-12 pl-4 pr-12 bg-white border-slate-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all text-sm rounded-xl shadow-sm" 
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button 
                type="submit" 
                disabled={loading || !input.trim()} 
                size="icon" 
                className="absolute right-1.5 top-1.5 h-9 w-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-105"
            >
                <Send className="h-4 w-4 text-white" />
            </Button>
        </form>
      </div>
    </div>
  )
}