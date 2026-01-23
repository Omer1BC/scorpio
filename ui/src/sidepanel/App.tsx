import { useState, useRef, useEffect } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { useAgent, AgentMessage } from '@/contexts/agentContext';
import { computeTool, sendToolResult } from '@/contexts/tools';

import './App.css'
interface Message {
  role: 'user' | 'assistant' | 'tool_call'
  content: string
  toolName?: string
  toolArgs?: Record<string, any>
}

interface Tool {
  id: string
  name : string,
  args : Record<string,any>
}


export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [currTools,setCurrTools] = useState<Tool[]>([])
  const [clearHistory, setClearHistory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, isLoading } = useAgent()
  const chatEndRef = useRef<HTMLDivElement>(null)

  const handleFileSelect = (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return 

    const reader = new FileReader()
    reader.onload = async (event) => {
      const abuffer = event.target?.result as ArrayBuffer 
      const uint8Array = new Uint8Array(abuffer)      
      let b64 = ''
      const chunkSize = 8192  // Process 8KB at a time
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize)
        b64 += String.fromCharCode(...chunk)
      }
      b64 = btoa(b64)

      await send(
        {
          fileName: file.name,
          filetType: file.type,
          fileSize: file.size,
          fileData: b64 
        }
      )
    }
    reader.readAsArrayBuffer(file)
  }

  const send = async (fileData: any) => {
    const resp = await fetch("http:localhost:8000/upload_file", 
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(fileData)
      }
    )
    return resp.json()

  }


  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const clear = () => {
    sendMessage('',true,"http://localhost:8000/clear_history")
    setMessages([])
  }
  const executeTools = async (accept: boolean) => {
    if (accept)
      await Promise.all(
        currTools.map(async tool => {
          const res = await computeTool(tool.name,tool.args);
          sendToolResult(tool.id,res)
        })
      )
    setCurrTools([])
    await handleSendMessage(`http://localhost:8000/${accept ? "approve" : "decline"}`)
  }

  const handleSendMessage = async (url?:string) => {
    if ( isLoading) return
    if (input.trim()){
      const userMessage: Message = { role: 'user', content: input }
      setMessages(prev => [...prev, userMessage])
    }
    const currentInput = input
    setInput('')


    try {
      // Call the backend API
      const agentMessages = await sendMessage(currentInput,clearHistory,url)

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
            setCurrTools(msg.tool_calls.map(
              (value) => ({
                id: value.id,
                name: value.name,
                args: value.args
              })
            ))

            for (const toolCall of msg.tool_calls) {
              // Compute tool result on client
              // const result = await computeTool(toolCall.name, toolCall.args)
              // // Send result to server
              // sendToolResult(toolCall.id, result).catch(err => {
              //   console.error('Failed to send tool result:', err)
              // })

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
            content: `Tool '${msg.name}' result: ✅`
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
          onClick={() => executeTools(true)}
          style={{
            border: 'none',
            fontSize: '20px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000'
          }}
        >
          ✓
        </button>
        <button
          onClick={() => executeTools(false)}
          style={{
            border: 'none',
            fontSize: '20px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000'
          }}
        >
          x
        </button>
        <button
          onClick={clear}
          style={{
            border: 'none',
            fontSize: '20px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000'
          }}
        >
          Clear
        </button>
      </div>
      <div style={{
        padding: '12px 16px',
        background: '#ffffff',
        borderTop: '1px solid #d2d2d7'
      }}>
        <input
          ref={fileInputRef}
          onChange={handleFileSelect}
          type='file'
          accept='*'
          style={{
            width: '100%',
            cursor: 'pointer'
          }}
        />
      </div>
    </Fragment>
  )
}
