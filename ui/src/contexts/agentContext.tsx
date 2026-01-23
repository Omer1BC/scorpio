import {createContext, useState,useContext} from 'react';
import { pingApi, pingToolApi, takeScreenshot } from './tools';

export interface AgentMessage {
    type: string;
    content: string;
    tool_calls?: Array<{
        id: string;
        name: string;
        args: Record<string, any>;
    }>;
    name?: string;
    tool_call_id?: string;
}

interface AgentContextType {
    sendMessage: (message: string,clearHistory: boolean, url? :string) => Promise<AgentMessage[]>;
    isLoading: boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [isLoading,setIsLoading] = useState(false);

    const sendMessage = async (message: string, clearHistory : boolean, url?: string): Promise<AgentMessage[]> => {
        setIsLoading(true);

        try {
            // Take a screenshot of the current tab
            // const screenshot = await takeScreenshot();

            // Send API request with screenshot and user's message
            // const response = await pingApi({
            //     message: message,
            //     images: [screenshot]
            // });

            // Call the tool agent API
            const toolResponse = await pingToolApi({
                data: message,
                thread_id: "1",
                clearHistory: clearHistory
            },url);

            console.log("Tool agent response:", toolResponse);

            return toolResponse.messages;
        }
        catch (error) {
            console.log("Error with model invocation: ",error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    };

    const value: AgentContextType = {
        sendMessage,
        isLoading
    };
    return (
        <AgentContext.Provider value={value}>
            {children}
        </AgentContext.Provider>
    )


};

export const useAgent = () => {
    const context = useContext(AgentContext);
    if (context == undefined) {
        throw new Error("useAgent not within Provider")
    }
    return context;
}


    

