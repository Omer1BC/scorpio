import { useState, useRef, useEffect } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { useAgent, AgentMessage } from '@/contexts/agentContext';

import './App.css'
interface Message {
  role: 'user' | 'assistant' | 'tool_call'
  content: string
  toolName?: string
  toolArgs?: Record<string, any>
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const { sendMessage, isLoading } = useAgent()
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')

    try {
      // Call the backend API
      const agentMessages = await sendMessage(currentInput)

      // Parse the agent messages and convert to UI messages
      const newMessages: Message[] = []

      for (const msg of agentMessages) {
        // Skip HumanMessage to avoid duplicating user input
        if (msg.type === 'HumanMessage') {
          continue
        }

        if (msg.type === 'AIMessage') {
          // Handle tool calls separately
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            for (const toolCall of msg.tool_calls) {
              newMessages.push({
                role: 'tool_call',
                content: `Calling tool: ${toolCall.name}`,
                toolName: toolCall.name,
                toolArgs: toolCall.args
              })
            }
          }

          // Add AI response content if present
          if (msg.content) {
            newMessages.push({
              role: 'assistant',
              content: msg.content
            })
          }
        } else if (msg.type === 'ToolMessage') {
          newMessages.push({
            role: 'assistant',
            content: `Tool '${msg.name}' result: ${msg.content}`
          })
        }
      }

      setMessages(prev => [...prev, ...newMessages])
    } catch (error) {
      console.error('Error sending message:', error)

      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please make sure the backend server is running.'
      }

      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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
                  {message.role === 'tool_call' && message.toolArgs && (
                    <div className='tool_args'>
                      <strong>Arguments:</strong>
                      <pre>{JSON.stringify(message.toolArgs, null, 2)}</pre>
                    </div>
                  )}
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
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </div>
    </Fragment>
  )
}
