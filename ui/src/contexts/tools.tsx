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

export const pingToolApi = async (payload: ToolAgentRequest): Promise<ToolAgentResponse> => {
    console.log("tool agent payload", payload);
    try {
        const response = await fetch('http://localhost:8000/tool_agent', {
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