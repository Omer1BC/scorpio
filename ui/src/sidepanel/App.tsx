import { useState, useRef, useEffect } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { useAgent } from '@/contexts/agentContext';

import './App.css'
interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setIsLoading(true)

    // Simulate API delay
    setTimeout(() => {
      const placeholderResponses = [
        "I'm a placeholder AI assistant. This is a simulated response to your message.",
        "Thank you for your message! This is a demo response without using the actual API.",
        "I understand you said: '" + currentInput + "'. This is a placeholder response.",
        "That's interesting! I'm currently running in demo mode with placeholder responses.",
        "I received your message. In a real scenario, I would process this with AI and provide a thoughtful response."
      ]

      const randomResponse = placeholderResponses[Math.floor(Math.random() * placeholderResponses.length)]

      const assistantMessage: Message = {
        role: 'assistant',
        content: randomResponse
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000) // 1 second delay to simulate API call
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Fragment>
      <div className='chat_window'>
        {messages.length === 0 ? (
          <div className='welcome_message'>
            <h2>AI Assistant</h2>
            <p>Ask me anything!</p>
          </div>
        ) : (
          <div className='messages'>
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className='message_content'>
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className='message assistant'>
                <div className='message_content typing'>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>
      <div className='input_window'>
        <input
          type='text'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder='Type your message...'
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </div>
    </Fragment>
  )
}
