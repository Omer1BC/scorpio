from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from langchain_core.messages import HumanMessage,SystemMessage
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.tools import tool
from agents.agent import Agent
import base64
from pathlib import Path


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
    clearHistory: bool 

# Tool Agent Response model
class ToolAgentResponse(BaseModel):
    messages: List[Dict]  # List of message dictionaries

# Complete Tool Request model
class CompleteToolRequest(BaseModel):
    tool_call_id: str
    result: str
@tool
def process_page() -> str:
    """
    Process and extract interactive elements from the current page DOM.

    This includes buttons, inputs, links, forms, and combobox (dropdown) elements.

    Returns:
        str: A formatted string of DOM elements in the format:
            <UID> <TAG> id=<ID> class=<CLASS> role=<ROLE> type=<TYPE> aria-expanded=<ARIA_EXPANDED> aria-haspopup=<ARIA_HASPOPUP> text=<TEXT>
            Where:
                - UID: Unique numeric identifier for referencing the element (use this with the click tool)
                - TAG: HTML element type (button, input, a, div, etc.)
                - ID: The element's HTML id attribute (or "[UNAVAILABLE]" if none)
                - CLASS: The element's HTML class attribute (or "[UNAVAILABLE]" if none)
                - ROLE: The element's ARIA role attribute (or "[UNAVAILABLE]" if none). Includes combobox for dropdowns.
                - TYPE: The element's type attribute, typically for input elements (or "[UNAVAILABLE]" if none)
                - ARIA_EXPANDED: Whether the element is expanded (true/false), useful for combobox/dropdown elements (or "[UNAVAILABLE]" if not set)
                - ARIA_HASPOPUP: Whether the element has a popup (true/false/menu/dialog, etc.), useful for combobox elements (or "[UNAVAILABLE]" if not set)
                - TEXT: Visible text content (truncated to 50 chars)

    Example:
        <0> <body> id=<[UNAVAILABLE]> class=<[UNAVAILABLE]> role=<[UNAVAILABLE]> type=<[UNAVAILABLE]> aria-expanded=<[UNAVAILABLE]> aria-haspopup=<[UNAVAILABLE]> text=<Welcome to the page>
          <1> <div> id=<main> class=<container> role=<[UNAVAILABLE]> type=<[UNAVAILABLE]> aria-expanded=<[UNAVAILABLE]> aria-haspopup=<[UNAVAILABLE]> text=<Welcome>
            <2> <button> id=<btn> class=<btn-primary> role=<button> type=<[UNAVAILABLE]> aria-expanded=<[UNAVAILABLE]> aria-haspopup=<[UNAVAILABLE]> text=<Click me!>
            <3> <div> id=<country-select> class=<combobox> role=<combobox> type=<[UNAVAILABLE]> aria-expanded=<false> aria-haspopup=<listbox> text=<Select a country>

        To click the button, use click(uid="2")
        To open the combobox, use click(uid="3")
    """
    result = wait_for_tool_result(timeout=30)
    return result

@tool
def click(uid: str) -> str:
    """Click an element on the page using its unique numeric identifier from process_page.

    Args:
        uid: The unique numeric identifier (UID) of the element to click, as returned by process_page.

    Returns:
        str: Result of the click action.

    Example:
        If process_page returns:
            <2> <button> <submit-btn> <Submit>
        Then call click(uid="2") to click that button.
    """
    result = wait_for_tool_result(timeout=30)
    return result
@tool
def input_tool(uid:str,content:str)->str:
    '''
    Tool used to fill an an input html element with data

    Args:
        uid: the unique id of the element to input text into
        content: the data to populate the input element with
    Returns:
        str: result of inputting the string into the element
    '''
    result = wait_for_tool_result(timeout=30)
    return result
@tool
def click_with_coordinates(x:int,y:int) -> str:
    '''Click an element on the page using x,y screen coordinates.

    Args:
        x: The x coordinate of the element to click
        y: The y coordinate of the element to click

    Returns:
        str: Result of the click action.
    '''
    result = wait_for_tool_result(timeout=30)
    return result

@tool
def take_screenshot() -> str:
    '''
    Takes a screenshot of the current page and returns it as a base64 encoded image along with viewport dimensions.

    Returns:
        str: A JSON string containing:
            - screenshot: base64 encoded representation of the screenshot image
            - viewport: object with width and height of the current viewport in pixels

    Example response:
        {
            "screenshot": "iVBORw0KGgoAAAANS...",
            "viewport": {"width": 1280, "height": 720}
        }
    '''
    result = wait_for_tool_result(timeout=30)
    return result

# @tool
# def inspect(uid: str) -> str:
#     '''Click an element on the page and inspect it to discover nested interactive elements.

#     Clicking an element may reveal new content (dropdowns, menus, modals, expandable sections, etc).
#     This tool clicks the element and then re-parses the DOM starting from that element to discover
#     any newly rendered or previously hidden child elements.

#     Args:
#         uid: The unique numeric identifier (UID) of the element to click and inspect, as returned by process_page.

#     Returns:
#         str: A formatted string of interactive elements within and below the clicked element,
#              in the same format as process_page output: <UID> <TAG> <ID> <CLASS> <TEXT>

#     Example:
#         If process_page returns:
#             <5> <input> <country> <select__input> <>
#         Call inspect(uid="5") to open the dropdown and discover menu options:
#             <11> <div> <option-usa> <option> <United States>
#             <12> <div> <option-uk> <option> <United Kingdom>
#     '''
#     result = wait_for_tool_result(timeout=30)
#     return result

@tool
def execute_js(code: str) -> str:
    """Execute arbitrary JavaScript code on the current page.

    Args:
        code: The JavaScript code to execute. Should return a value or use console.log/console.error for output.

    Returns:
        str: A JSON string containing:
            - result: The return value of the code
            - stdout: All console.log output captured as a string
            - stderr: All console.error and console.warn output captured as a string
            - error: Any exception that occurred during execution (if applicable)

    Example:
        execute_js(code="document.title")
        Returns: {"result": "My Page Title", "stdout": "", "stderr": ""}

        execute_js(code="console.log('hello'); return 42")
        Returns: {"result": 42, "stdout": "hello", "stderr": ""}
    """
    result = wait_for_tool_result(timeout=30)
    return result if result else '{"error": "Timeout executing JavaScript"}'

@tool
def add(x:int,y:int) -> str:
    '''A tool that adds 2 numbers and returns their sum as a string result'''
    # Wait for client to compute and send result
    result = wait_for_tool_result(timeout=30)
    return result if result else f"Timeout: {x}+{y}"

@tool
def subtract(x:int, y:int) -> str:
    '''A tool that subtracts 2 numbers and returns their diff as a string result'''
    # Wait for client to compute and send result
    result = wait_for_tool_result(timeout=30)
    return result if result else f"Timeout: {x}-{y}"

@tool
def get_users_resume() -> str:
    '''
    Get the user's resume information.

    :return: textual resume information of the user
    '''
    try:
        with open('uploads/res.md', "r", encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Resume file not found at uploads/res.md"
    except Exception as e:
        return f"Error reading resume: {str(e)}"

@tool
def get_application_answers() -> str:
    '''
    Get additional answers the users prepared for this specific application.
    Retrieves answers to application questions like location, visa requirements,
    programming language preferences, and other relevant information.

    :return: application question answers from the user
    '''
    try:
        with open('uploads/app.md', "r", encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Application answers file not found at uploads/app.md"
    except Exception as e:
        return f"Error reading application answers: {str(e)}"

# Initialize old agent for backward compatibility
llm = ChatOpenAI(model="gpt-4o-mini")
agent = create_agent(llm,tools=[add])

# Initialize new Agent class
tool_agent = Agent([process_page, click, input_tool, click_with_coordinates, get_users_resume, get_application_answers, take_screenshot, execute_js])

# Store conversation histories per thread
conversation_histories: Dict[str, List] = {}

# Queue for completed tool calls
tool_results_queue: Dict[str, str] = {}  # {tool_call_id: result}
import threading
import time
tool_queue_lock = threading.Lock()
current_tool_call_id: Optional[str] = None

def wait_for_tool_result(timeout: int = 30) -> Optional[str]:
    """Wait for any tool result to appear in the queue"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        with tool_queue_lock:
            if tool_results_queue:
                # Pop any available result
                _, result = tool_results_queue.popitem()
                return result
        time.sleep(0.1)  # Poll every 100ms
    return None


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

@app.post("/upload_file")
async def upload_file(request:dict):
    file_data = base64.b64decode(request['fileData'])
    file_name = request['fileName']

    # Create uploads directory in current working directory
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    # Write to disk
    with open(os.path.join(upload_dir, file_name), "wb") as f:
        f.write(file_data)
    return {"status":"success"}

@app.post("/clear_history",response_model=ToolAgentResponse)
async def clear_history(request:ToolAgentRequest):
    print(f"Before clear: {len(conversation_histories.get(request.thread_id, []))} messages")

    if not request.thread_id in conversation_histories:
        return ToolAgentResponse(messages=[])
    else:
        conversation_histories[request.thread_id] = []
        await tool_agent.clear_history(request.thread_id)
        return ToolAgentResponse(messages=[])
@app.post("/approve",response_model=ToolAgentResponse)
async def approve(request:ToolAgentRequest):
    if not request.thread_id in conversation_histories:
        return ToolAgentResponse(messages=[])
    else:
        config = {
            "configurable": {
                "thread_id": request.thread_id
            }
        }        
        payload = {
            "config": config,
            "data": request.data
        }
        res =  tool_agent.resume_with_approved_tools(payload)
        return ToolAgentResponse(messages=get_message_dict(res))
@app.post("/decline",response_model=ToolAgentResponse)
async def approve(request:ToolAgentRequest):
    if not request.thread_id in conversation_histories:
        return ToolAgentResponse(messages=[])
    else:
        config = {
            "configurable": {
                "thread_id": request.thread_id
            }
        }        
        payload = {
            "config": config,
            "data": request.data
        }
        res =  tool_agent.resume_with_declined_tools(payload)
        return ToolAgentResponse(messages=get_message_dict(res))
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

            conversation_histories[request.thread_id] = [SystemMessage(content='''
                you are a digital job application assistant

                you are to help the user fill out a job application based on the inforation provided
                You must first fill out all the fields with the information you have
                -For the remaining fields you are unsure about, consult the user and help them complete them
''')]



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

        return ToolAgentResponse(messages=get_message_dict(result))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

def get_message_dict(result:list):
    messages_dict = []
    for msg in  result:
        msg_dict = {
            "type": type(msg).__name__,
            "content": msg.content if hasattr(msg, 'content') else str(msg),
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
    return messages_dict

@app.post("/completeTool")
async def complete_tool(request: CompleteToolRequest):
    """
    Endpoint for client to send completed tool results

    Args:
        request: CompleteToolRequest containing tool_call_id and result

    Returns:
        Success status
    """
    try:
        with tool_queue_lock:
            tool_results_queue[request.tool_call_id] = request.result

        print(f"Tool result received: {request.tool_call_id} -> {request.result}")
        return {"status": "success", "message": "Tool result queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error queueing tool result: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
