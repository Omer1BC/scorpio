import Logo from '@/assets/crx.svg'
import { useState } from 'react'
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
