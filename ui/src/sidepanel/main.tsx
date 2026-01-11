import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AgentProvider } from '@/contexts/agentContext.tsx';
createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AgentProvider>
        <App />
      </AgentProvider>
      
    </StrictMode>,
)
