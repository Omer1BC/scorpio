import Logo from '@/assets/crx.svg'
import { useState, useEffect, useRef } from 'react'
import './App.css'

function processPage(
  element: Element,
  depth: number = 0,
  counter: { value: number } = { value: 0 },
  domMap: Record<number, Element> = {}
): { str: string; domMap: Record<number, Element> } {
      if (element.nodeType !== Node.ELEMENT_NODE || depth > 5) {
        return { str: "", domMap };
      }

      const uid = counter.value++;
      domMap[uid] = element;

      const tag = element.tagName.toLowerCase();
      const id = element.id || "no-id";
      const text = (element as HTMLElement).innerText?.trim().substring(0, 50) || "";
      const indent = "  ".repeat(depth);

      let str = `${indent}<${uid}> <${tag}> <${id}> <${text}>\n`;

      for (const child of Array.from(element.children)) {
          const result = processPage(child, depth + 1, counter, domMap);
          str += result.str;
      }

      return { str, domMap };
}

function App() {
  const [show, setShow] = useState(false)
  const toggle = () => setShow(!show)

  const clickStartLearningButton = () => {
    const button = document.querySelector('button.learn') as HTMLButtonElement
    if (button) {
      button.click()
      console.log('Start Learning button clicked')
    } else {
      console.error('Start Learning button not found')
    }
  }

  const domMapRef = useRef<Record<number, HTMLElement>>({})

  useEffect(() => {
    const listener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        if (message.action == 'processPage') {
          const { str, domMap } = processPage(document.body)
          domMapRef.current = domMap as Record<number, HTMLElement>
          sendResponse({ success: true, data: str })
        }
        if (message.action == 'click') {
          const element = domMapRef.current[message.uid]
          if (element && element instanceof HTMLElement) {
            element.click()
            sendResponse({ success: true, data: `clicked ${message.uid}` })
          } else {
            sendResponse({ success: false, data: `Element ${message.uid} not found in domMap` })
          }
        }
        return true
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [])

  return (
    <div className="popup-container">
      {show && (
        <div className={`popup-content ${show ? 'opacity-100' : 'opacity-0'}`}>
          <h1>HELLO CRXJS</h1>
        </div>
      )}
      <button className="toggle-button" onClick={clickStartLearningButton}>
        <img src={Logo} alt="CRXJS logo" className="button-icon" />
      </button>
    </div>
  )
}

export default App
