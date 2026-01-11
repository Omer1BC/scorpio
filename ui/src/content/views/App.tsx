import Logo from '@/assets/crx.svg'
import { useState, useEffect } from 'react'
import './App.css'

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

  useEffect(() => {
    const listener = (message: any,sender:chrome.runtime.MessageSender, sendResponse: (response?: any) => void) =>{
      console.log("Received", message)

      if (message.action == 'clickStartLearning') {
	clickStartLearningButton();
        sendResponse({success: true, message: 'clicked button'})
      }
          return true
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }

  },[])

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
