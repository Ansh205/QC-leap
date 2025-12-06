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
  const [available, setAvailable] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

  useEffect(() => {
    // Check chatbot availability
    const checkHealth = async () => {
      try {
        const token = localStorage.getItem('qc_leap_token')
        const response = await axios.get(`${API_URL}/chatbot/health`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setAvailable(response.data.available)

        if (!response.data.available) {
          setMessages([{
            role: 'assistant',
            content: 'Hi! I\'m Jemih, your QC-Leap assistant. However, the chatbot service is currently unavailable because the OpenAI API key is not configured. Please contact your administrator.'
          }])
        } else {
          setMessages([{
            role: 'assistant',
            content: 'Hello! I\'m Jemih, your AI assistant for QC Leap. How can I help you today?'
          }])
        }
      } catch (error) {
        console.error('Failed to check chatbot health:', error)
      }
    }

    checkHealth()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const token = localStorage.getItem('qc_leap_token')
      const response = await axios.post(
        `${API_URL}/chatbot/chat`,
        {
          session_id: sessionId,
          message: userMessage
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response
      }])
    } catch (error: any) {
      toast.error('Failed to send message: ' + (error.response?.data?.detail || error.message))
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-background">
      <div className="border-b border-gray-200 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-2">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Jemih - QC Leap Assistant</h1>
              <p className="text-sm text-muted-foreground">
                {available ? 'Online and ready to help' : 'Currently unavailable'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl p-4 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="bg-primary rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white border border-gray-100 text-slate-800 rounded-bl-none'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="text-base leading-relaxed overflow-hidden">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-2 mt-4" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2 mt-3" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-md font-bold mb-1 mt-2" {...props} />,
                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600" {...props} />,
                        code: ({ node, ...props }) => {
                          // @ts-ignore
                          const isInline = props.inline || !props.className?.includes('language')
                          return isInline ? (
                            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600 border border-gray-200" {...props} />
                          ) : (
                            <div className="bg-slate-900 p-3 rounded-lg overflow-x-auto my-3 text-slate-50 border border-slate-700 shadow-inner">
                              <code className="text-sm font-mono" {...props} />
                            </div>
                          )
                        },
                        pre: ({ node, ...props }) => <pre className="p-0 m-0 bg-transparent" {...props} />,
                        table: ({ node, ...props }) => <div className="overflow-x-auto my-3 rounded-lg border border-gray-200"><table className="min-w-full text-sm" {...props} /></div>,
                        th: ({ node, ...props }) => <th className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-left font-semibold" {...props} />,
                        td: ({ node, ...props }) => <td className="border-b border-gray-100 px-4 py-2 last:border-0" {...props} />,
                        a: ({ node, ...props }) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="bg-slate-200 rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <UserIcon className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-primary rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-3 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={available ? "Type your message..." : "Chatbot unavailable"}
              disabled={!available || loading}
              className="flex-1 h-12 text-base rounded-full px-6 shadow-sm border-gray-300 focus:border-blue-500"
            />
            <Button
              onClick={handleSend}
              disabled={!available || !input.trim() || loading}
              className="h-12 w-12 rounded-full p-0 flex items-center justify-center shadow-md bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
            </Button>
          </div>
          <p className="text-xs text-center text-slate-400 mt-2">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}