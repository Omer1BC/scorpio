import {createContext, useState,useContext} from 'react';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { screenshotTool } from './tools';

interface AgentContextType {
    model: ChatGoogleGenerativeAI,
    sendMessage: (message: string) => Promise<string>;
    isLoading: boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [isLoading,setIsLoading] = useState(false);
    const model = new ChatGoogleGenerativeAI(
        {model:"gemini-2.5-flash",
        apiKey: import.meta.env.VITE_GOOGLE_API_KEY
    })


    const sendMessage = async (message: string ): Promise<string> => {
        setIsLoading(true);
        try {
            const response = await model.invoke(message);
            return response.content as string;
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
        model,sendMessage,isLoading
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


    

