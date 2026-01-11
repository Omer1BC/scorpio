import {tool} from "langchain";
import {z} from 'zod';



export const screenshotTool = tool(
    async ()=>{
        const img = await new Promise((resolve,reject) => {
            chrome.tabs.captureVisibleTab(
                {format:'png',quality: 100},
                (dataUrl) => {
                    if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError.message);
                    }
                    return resolve(dataUrl);                }
            )
            
        })
        return [
            {


                type: "img_ul", 
                img_url : {
                    url: `data:image/png;base64,${img}`
                }
                
            }

        ]
    },
    {
        name: "screenshot",
        description: "takes a screenshot of the current tab",
        schema: z.object({})
    }

)