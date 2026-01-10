import crxLogo from '@/assets/crx.svg'
import reactLogo from '@/assets/react.svg'
import viteLogo from '@/assets/vite.svg'
import HelloWorld from '@/components/HelloWorld'
import './App.css'
import { useState, useEffect } from 'react'
export default function App() {
  const [activeTabUrl, setActiveTabUrl] = useState<string>('')

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        setActiveTabUrl(tabs[0]?.url ?? 'No active tab')
      })
    } else {
      setActiveTabUrl('Chrome API not available - check extension context')
      console.error('chrome.tabs is undefined. Make sure extension is loaded properly.')
    }
  }, [])
  
  return (
    <div>
      <p>Active Tab: {activeTabUrl}  <code>src/App.tsx</code> and save to test HMR</p>
      <a href="https://vite.dev" target="_blank" rel="noreferrer">
        <img src={viteLogo} className="logo" alt="Vite logo" />
      </a>
      <a href="https://reactjs.org/" target="_blank" rel="noreferrer">
        <img src={reactLogo} className="logo react" alt="React logo" />
      </a>
      <a href="https://crxjs.dev/vite-plugin" target="_blank" rel="noreferrer">
        <img src={crxLogo} className="logo crx" alt="crx logo" />
      </a>
      <HelloWorld msg="Vite + React + CRXJS" />
    </div>
  )
}
