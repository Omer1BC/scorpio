// Standalone function to take a screenshot of the current visible tab
export const takeScreenshot = async (): Promise<string> => {
    const img = await new Promise<string>((resolve, reject) => {
        chrome.tabs.captureVisibleTab(
            { format: 'png', quality: 100 },
            (dataUrl) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError.message);
                }
                return resolve(dataUrl as string);
            }
        );
    });
    return img;
};
// Type definition for Agent Request matching the backend
interface AgentRequest {
    message: string;
    images?: string[];
}

// Type definition for Agent Response from the backend
interface AgentResponse {
    response: string;
}

// Type definition for Tool Agent Request
interface ToolAgentRequest {
    data: string;
    thread_id?: string;
    clearHistory: boolean
}

// Type definition for Tool Agent Response
interface ToolAgentResponse {
    messages: Array<{
        type: string;
        content: string;
        tool_calls?: Array<{
            id: string;
            name: string;
            args: Record<string, any>;
        }>;
        name?: string;
        tool_call_id?: string;
    }>;
}

export const pingApi = async (payload: AgentRequest): Promise<AgentResponse> => {
    console.log("payload",payload)
    try {
        const response = await fetch('http://localhost:8000/agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AgentResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error calling agent API:', error);
        throw error;
    }
}

export const pingToolApi = async (payload: ToolAgentRequest, url : string = 'http://localhost:8000/tool_agent' ): Promise<ToolAgentResponse> => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ToolAgentResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error calling tool agent API:', error);
        throw error;
    }
}

// Compute tool result on client side
export const computeTool = async (name: string, args: Record<string, any>): Promise<string> => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    if (name === 'process_page') {

        return await new Promise((resolve,reject) => {
            chrome.tabs.sendMessage(tab.id!, {action: 'processPage'}, (resposne) => {
                if (chrome.runtime.lastError){
                    reject(chrome.runtime.lastError.message)
                }
                else {
                    resolve(resposne.data)
                }
            })
        })
    } else if (name === 'click') {
        return await sendMessageToTab(tab.id!,{action: 'click',uid:args.uid})

    } else if  (name == 'input_tool') {
        return await sendMessageToTab(tab.id!,{action: "input_tool",uid: args.uid, content: args.content})
    } else if (name === 'take_screenshot') {
        const screenshot = await takeScreenshot()
        // Extract base64 from data URL (remove "data:image/png;base64," prefix)
        const base64 = screenshot.includes('base64,') ? screenshot.split('base64,')[1] : screenshot

        // Get viewport dimensions
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
        const viewport = await new Promise<{width: number, height: number}>((resolve) => {
            chrome.tabs.sendMessage(tab.id!, {action: 'getViewportDimensions'}, (response) => {
                resolve(response.viewport || {width: 0, height: 0})
            })
        })

        // Return both screenshot and viewport info
        return JSON.stringify({
            screenshot: base64,
            viewport: viewport
        })
    } else if (name === 'click_with_coordinates') {
        return await sendMessageToTab(tab.id!, {action: 'clickWithCoordinates', x: args.x, y: args.y})
    } else if (name === 'inspect') {
        return await sendMessageToTab(tab.id!, {action: 'inspect', uid: args.uid})
    } else if (name === 'execute_js') {
        return await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'EXECUTE_JS',
                code: args.code,
                tabId: tab.id
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message)
                } else {
                    resolve(JSON.stringify(response))
                }
            })
        })
    }
    return 'Unknown tool';
}

async function sendMessageToTab(id: number, toolArgs : any) : Promise<string> {
    return new Promise((resolve,reject) => {
        chrome.tabs.sendMessage(id,toolArgs,(response) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError.message)
            }
            else {
                return resolve(response.data)
            }
        })
    })

}







// Send completed tool result to server
export const sendToolResult = async (toolCallId: string, result: string): Promise<void> => {
    try {
        const response = await fetch('http://localhost:8000/completeTool', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tool_call_id: toolCallId,
                result: result
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log(`Tool result sent: ${toolCallId} -> ${result}`);
    } catch (error) {
        console.error('Error sending tool result:', error);
        throw error;
    }
}