from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.tools import tool
from agent import Agent




# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Agent API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLM



# Request model
class AgentRequest(BaseModel):
    message: str
    images: Optional[List[str]] = None  # List of base64 encoded images


# Response model
class AgentResponse(BaseModel):
    response: str

# Tool Agent Request model
class ToolAgentRequest(BaseModel):
    data: str  # User message or "Approve"/"Disapprove"
    thread_id: str = "1"  # Thread ID for conversation state

# Tool Agent Response model
class ToolAgentResponse(BaseModel):
    messages: List[Dict]  # List of message dictionaries

@tool
def add(x:int,y:int) -> str:
    '''A tool that adds 2 numbers and returns their sum as a string result'''
    return str(x+y)

@tool
def subtract(x:int, y:int) -> str:
    '''A tool that subtracts 2 numbers and returns their diff as a string result'''
    return str(x - y)

# Initialize old agent for backward compatibility
llm = ChatOpenAI(model="gpt-4o-mini")
agent = create_agent(llm,tools=[add])

# Initialize new Agent class
tool_agent = Agent([add, subtract])

# Store conversation histories per thread
conversation_histories: Dict[str, List] = {}


def format_message_history(response) -> str:
    if not isinstance(response, dict) or "messages" not in response:
        return str(response)

    formatted_history = []

    for msg in response["messages"]:
        msg_type = type(msg).__name__

        if msg_type == "HumanMessage":
            # User message
            content = msg.content if hasattr(msg, 'content') else str(msg)
            formatted_history.append(f"👤 User: {content}")

        elif msg_type == "AIMessage":
            # AI message - check for tool calls
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                # AI is calling tools
                for tool_call in msg.tool_calls:
                    tool_name = tool_call.get('name', 'unknown')
                    tool_args = tool_call.get('args', {})
                    formatted_history.append(f"🤖 AI: Calling tool '{tool_name}' with args: {tool_args}")

            # AI regular response
            if hasattr(msg, 'content') and msg.content:
                formatted_history.append(f"🤖 AI: {msg.content}")

        elif msg_type == "ToolMessage":
            # Tool response
            tool_name = msg.name if hasattr(msg, 'name') else 'unknown'
            tool_content = msg.content if hasattr(msg, 'content') else str(msg)
            formatted_history.append(f"🔧 Tool '{tool_name}': {tool_content}")

    return "\n\n".join(formatted_history)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Agent API is running"}


@app.post("/agent", response_model=AgentResponse)
async def agent_endpoint(request: AgentRequest):
    """
    Agent endpoint that processes messages using Gemini 2.5 Flash
    Supports both text-only and multimodal (text + images) queries

    Args:
        request: AgentRequest containing the user message and optional base64 images

    Returns:
        AgentResponse with the LLM response
    """
    try:
        # If no images, use simple text invocation
        if not request.images:
            message = HumanMessage(content=request.message)
            response = agent.invoke({"messages": [message]})
        else:
            # Construct multimodal message with text and images in a single content array

            content = [{"type": "text", "text": request.message}]

            # Add each image to the content
            for img_base64 in request.images:
                # Remove data URL prefix if present
                if "base64," in img_base64:
                    img_base64 = img_base64.split("base64,")[1]

                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_base64}"}
                })
                print('found image')

            # Create single HumanMessage with multimodal content (text + images)
            message = HumanMessage(content=content)
            response = agent.invoke({"messages": [message]})

        # Format the agent's message history into a readable response
        response_text = format_message_history(response)

        return AgentResponse(response=response_text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")


@app.post("/tool_agent", response_model=ToolAgentResponse)
async def tool_agent_endpoint(request: ToolAgentRequest):
    """
    Tool agent endpoint with approval/disapproval workflow
    Returns a list of messages from the agent

    Args:
        request: ToolAgentRequest containing the data (user message or Approve/Disapprove) and thread_id

    Returns:
        ToolAgentResponse with list of messages
    """
    try:
        # Get or initialize conversation history for this thread
        if request.thread_id not in conversation_histories:
            conversation_histories[request.thread_id] = []

        history = conversation_histories[request.thread_id]

        # Create config with thread_id
        config = {
            "configurable": {
                "thread_id": request.thread_id
            }
        }

        # Create payload for agent
        payload = {
            "config": config,
            "data": request.data
        }

        # Get response from agent
        result = tool_agent.get_response(payload, history)

        # Update conversation history
        conversation_histories[request.thread_id] = history + result

        # Convert messages to dictionaries for JSON response
        messages_dict = []
        for msg in result:
            msg_dict = {
                "type": type(msg).__name__,
                "content": msg.content if hasattr(msg, 'content') else str(msg)
            }

            # Add tool_calls if present (for AIMessage)
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                tool_calls_formatted = []
                for tool_call in msg.tool_calls:
                    tool_calls_formatted.append({
                        "id": tool_call.get("id"),
                        "name": tool_call.get("name"),
                        "args": tool_call.get("args", {})
                    })
                msg_dict["tool_calls"] = tool_calls_formatted

            # Add tool info if present (for ToolMessage)
            if hasattr(msg, 'name'):
                msg_dict["name"] = msg.name
            if hasattr(msg, 'tool_call_id'):
                msg_dict["tool_call_id"] = msg.tool_call_id

            messages_dict.append(msg_dict)

        return ToolAgentResponse(messages=messages_dict)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
