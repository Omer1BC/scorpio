import Logo from '@/assets/crx.svg'
import { useState, useEffect, useRef } from 'react'
import './App.css'

function isInteractive(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  const interactiveTags = ['button', 'input', 'textarea', 'select', 'form', 'a', 'label'];

  if (interactiveTags.includes(tag)) {
    return true;
  }

  if (element.hasAttribute('onclick') || element.hasAttribute('contenteditable')) {
    return true;
  }

  const role = element.getAttribute('role');
  // Include combobox elements (dropdown/select-like components)
  if (role === 'button' || role === 'link' || role === 'menuitem' || role === 'combobox') {
    return true;
  }

  return false;
}

function processPage(
  element: Element,
  depth: number = 0,
  counter: { value: number } = { value: 0 },
  domMap: Record<number, Element> = {}
): { str: string; domMap: Record<number, Element> } {
      if (element.nodeType !== Node.ELEMENT_NODE ) {
        return { str: "", domMap };
      }

      let str = "";
      let uid = -1;

      // Only add to domMap and output if element is interactive
      if (isInteractive(element)) {
        uid = counter.value++;
        domMap[uid] = element;

        const tag = element.tagName.toLowerCase();
        const id = element.id || "[UNAVAILABLE]";
        const className = element.className || "[UNAVAILABLE]";
        const role = element.getAttribute('role') || "[UNAVAILABLE]";
        const type = (element as HTMLInputElement).type || "[UNAVAILABLE]";
        const ariaExpanded = element.getAttribute('aria-expanded') || "[UNAVAILABLE]";
        const ariaHasPopup = element.getAttribute('aria-haspopup') || "[UNAVAILABLE]";
        const text = (element as HTMLElement).innerText?.trim().substring(0, 50) || "";
        const indent = "  ".repeat(depth);

        str = `${indent}<${uid}> <${tag}> id=<${id}> class=<${className}> role=<${role}> type=<${type}> aria-expanded=<${ariaExpanded}> aria-haspopup=<${ariaHasPopup}> text=<${text}>\n`;
      }

      // Always traverse children to find nested interactive elements
      for (const child of Array.from(element.children)) {
          const result = processPage(child, depth + 1, counter, domMap);
          str += result.str;
      }

      return { str, domMap };
}

function click_element(element: HTMLElement) {
      // element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.focus()
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));  
      element.click()
}

function App() {
  const [show, setShow] = useState(false)
  const toggle = () => setShow(!show)



  const domMapRef = useRef<Record<number, HTMLElement>>({})

  // Test function to execute JS via background script
  const testExecuteJS = async () => {
    const codeString = `
      const button = document.querySelector('button[data-slot="button"].learn');
      if (button) {
        button.click();
        return 'Start Learning button clicked successfully';
      } else {
        return 'Start Learning button not found';
      }
    `

    chrome.runtime.sendMessage({
      type: 'EXECUTE_JS',
      code: codeString
    }, (response) => {
      console.log('Result from background:', response)
    })
  }


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
 
            click_element(element)
            sendResponse({ success: true, data: `clicked ${message.uid}` })
          } else {
            sendResponse({ success: false, data: `Element ${message.uid} not found in domMap` })
          }
        }
        if (message.action == 'input_tool') {
          const element = domMapRef.current[message.uid]
          if (element && element instanceof HTMLInputElement) {
            element.value = message.content
            element.dispatchEvent(new Event('input', {bubbles: true}))
            element.dispatchEvent(new Event('change', {bubbles: true}))

            element.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true,
              cancelable: true
            }))
            element.dispatchEvent(new KeyboardEvent('keypress', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true,
              cancelable: true
            }))
            element.dispatchEvent(new KeyboardEvent('keyup', {
              key: 'Enter',
              code: 'Enter',
              bubbles: true,
              cancelable: true
            }))
            sendResponse({success: true, data: `Element successfully updated with input ${message.content}`})

          }
          else
          sendResponse({success: false, data: `Element can not be found or is type input`})

        }
        if (message.action == 'clickWithCoordinates') {
          const element = document.elementFromPoint(message.x, message.y)
          if (element && element instanceof HTMLElement) {
            click_element(element)
            sendResponse({success: true, data: `Clicked element at (${message.x}, ${message.y})`})
          } else {
            sendResponse({success: false, data: `No element found at (${message.x}, ${message.y})`})
          }
        }
        if (message.action == 'inspect') {
          const element = domMapRef.current[message.uid]
          if (element && element instanceof HTMLElement) {
            click_element(element)
            const {str, domMap } = processPage(element,5,{value: Object.keys(domMapRef.current).length},domMapRef.current)
            domMapRef.current = {...domMapRef.current,...(domMap as Record <number,HTMLElement>) }
            sendResponse({success: true, data: `Found the following new set of nested elements\n${str}`})
          }
          else {
            sendResponse({success: true, data: `Element not found or isn't proper html element`})

          }


        }
        if (message.action == 'getViewportDimensions') {
          sendResponse({
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          })
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
    </div>
  )
}

export default App
