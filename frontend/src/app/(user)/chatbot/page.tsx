'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
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
      // Replace with your actual API endpoint
      // const response = await axios.post('/api/chat', { message: input, sessionId })
      // const botMessage: Message = { role: 'assistant', content: response.data.message }
      
      // Simulation for demo purposes
      setTimeout(() => {
        const botMessage: Message = { 
            role: 'assistant', 
            content: "I'm analyzing your defect data. It looks like the most common defect type this week is **Surface Scratching**, primarily affecting the Q4 production batch." 
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
    // Height calculation: 100vh - Navbar(4rem/64px) - Layout Padding(2rem/32px approx) = ~calc(100vh - 6.5rem)
    // using flex column to keep input at bottom
    <div className="flex h-[calc(100vh-6.5rem)] flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Sticky Header - Matches 'Inspection Models' layout style */}
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur-md px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
             <Bot className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">Jemih AI</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">QC Assistant</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30 space-y-6">
        {messages.length === 0 && (
           <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <div className="bg-slate-100 p-4 rounded-full mb-3">
                  <Bot className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">No messages yet</h3>
              <p className="text-xs max-w-xs mt-1">Ask me about defect rates, model performance, or recent inspection runs.</p>
           </div>
        )}
        
        {messages.map((m, index) => (
          <div
            key={index}
            className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
              }`}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                 <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-none bg-white border border-slate-100 px-4 py-3 text-sm shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-slate-400 text-xs">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-100 bg-white p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-3 max-w-4xl mx-auto"
        >
            <Input 
              className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-300 transition-all text-sm" 
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button 
                type="submit" 
                disabled={loading || !input.trim()} 
                size="icon" 
                className="h-11 w-11 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/10"
            >
                <Send className="h-4 w-4" />
            </Button>
        </form>
      </div>
    </div>
  )
}