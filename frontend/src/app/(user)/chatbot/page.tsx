'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'

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
    <div className="container max-w-4xl mx-auto py-8">
      <Card className="h-[calc(100vh-12rem)]">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-2">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Jemih - QC Leap Assistant</CardTitle>
              <p className="text-sm text-muted-foreground">
                {available ? 'Online and ready to help' : 'Currently unavailable'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-[calc(100%-5rem)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="bg-primary rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.role === 'user' && (
                  <div className="bg-slate-200 dark:bg-slate-700 rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="bg-primary rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={available ? "Ask me anything about QC Leap..." : "Chatbot unavailable"}
                disabled={!available || loading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!available || !input.trim() || loading}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
