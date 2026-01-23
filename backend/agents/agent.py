from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langchain.tools import tool
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from dotenv import load_dotenv
import os 
load_dotenv()

#Response is now an array of messages!


#Wrapper class for agent that can pause and resume conversations
class Agent:
    #initialize the graph, 
    def __init__(self,tools):
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("Must specify OpenAI key in .env")
        self.llm = ChatOpenAI(model="gpt-4o-mini",api_key=os.getenv("OPENAI_API_KEY")).bind_tools(tools)
        # create the agent loop
        def invoke_model(state:MessagesState):
            import json
            messages = state["messages"].copy()
            # Work backwards through consecutive ToolMessages to find take_screenshot
            for i in range(len(messages) - 1, -1, -1):
                msg = messages[i]

                if hasattr(msg, 'name'):  # It's a ToolMessage
                    if msg.name == 'take_screenshot' and hasattr(msg, 'content'):
                        # Parse the JSON content which includes both screenshot and viewport
                        try:
                            screenshot_data = json.loads(msg.content)
                            screenshot_base64 = screenshot_data.get('screenshot', msg.content)
                            viewport = screenshot_data.get('viewport', {})
                        except (json.JSONDecodeError, TypeError):
                            # Fallback to old format (just base64 string)
                            screenshot_base64 = msg.content
                            viewport = {}

                        # Format the screenshot and viewport info for the LLM
                        content = [
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{screenshot_base64}"}
                            }
                        ]

                        # Add viewport information as text
                        if viewport:
                            viewport_text = f"Viewport dimensions: {viewport['width']}x{viewport['height']} pixels"
                            content.append({
                                "type": "text",
                                "text": viewport_text
                            })

                        messages.append(HumanMessage(content=content))
                        break
                    # Continue looking backwards for more ToolMessages
                else:
                    # Hit a non-ToolMessage, stop looking
                    break

            resp = self.llm.invoke(messages)
            return {"messages": [resp]}
        
        def should_continue(state:MessagesState):
            return True if hasattr(state["messages"][-1],"tool_calls") and state["messages"][-1].tool_calls else False
        
        #llm can either call tools or end
        graph = StateGraph(MessagesState)
        graph.add_edge(START,"get_response")
        graph.add_node("get_response",invoke_model)
        graph.add_node("tools",ToolNode(tools))
        graph.add_conditional_edges("get_response",should_continue,{True: "tools",False: END})
        graph.add_edge("tools","get_response")

        memory = MemorySaver()
        self.agent = graph.compile(checkpointer=memory,interrupt_before=["tools"])
    '''
        {
            config: ...
            data: ...
        }
    if data is either input, invalid or Approve/Disapprove
    '''
    async def clear_history(self,thread_id) -> list:
        await self.agent.checkpointer.adelete_thread(thread_id)
        return []
    def resume_with_approved_tools(self,payload):
        extended = []
        for event in self.agent.stream(None, payload["config"], stream_mode="updates"):
            for _,update in event.items():
                if "messages" in update: extended.extend(update["messages"]) 
        return extended
    def resume_with_declined_tools(self,payload):
        snapshot = self.agent.get_state(payload["config"])
        old_hist = snapshot.values["messages"]
        declined_tools = [
            ToolMessage(content="Tool use declined by user: user is unhappy with tool selection, ask for follow up to get more information!",
                        tool_call_id=tool["id"])
        for tool in old_hist[-1].tool_calls]
        # old_hist[-1].tool_calls = []
        # newhist = old_hist + declined_tools 

        self.agent.update_state(payload["config"],{"messages": declined_tools})
        extended = []
        for event in self.agent.stream(None,payload["config"],stream_mode="updates"):
            for _,update in event.items():
                if "messages" in update: extended.extend(update["messages"])
        return extended

    def get_response(self,payload,history=[]):
        if not payload["data"]:
            return []
        last_event = None
        if payload["data"] not in ("Approve","Disapprove"):
            input_message = HumanMessage(content=payload["data"])
            history.append(input_message)
            extended = []
            for event in self.agent.stream({"messages": history},payload["config"],stream_mode="updates"):
                for _,update in event.items():
                    if "messages" in update: extended.extend(update["messages"])
                last_event = event
            # remaining = last_event["messages"][-1]
            snapshot = self.agent.get_state(payload["config"])
            assert(snapshot.next, "Error in the exeuction flow")
            result = "Tool call intention: \n"
            if snapshot.values["messages"][-1].tool_calls:
                for tool in  snapshot.values["messages"][-1].tool_calls:
                    result += f"f{tool["name"]} | {tool["args"]}\n"
                # remaining +=  [AIMessage(content=result)]
            return extended
    def format_message_history(self,response) -> str:
        """Format the agent's message history into a readable string"""

        formatted_history = []

        for msg in response:
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

        return "\n".join(formatted_history)
# config = {
#     "configurable" : {
#         "thread_id" : "1"
#     }
# }

# @tool
# def add(x: int, y: int) -> str:
#     '''A tool that adds 2 numbers and returns their sum as a string result'''
#     return str(x + y)
# @tool
# def subtract(x: int, y: int) -> str:
#     '''A tool that subs 2 numbers and returns their diff as a string result'''
#     return str(x - y)

# agent = Agent([add,subtract])
# conversation_history = []
# while True: 
#     inp = input("You: ")
#     payload = {
#         "config": config,
#         "data" : inp,
#     }
#     result =  agent.get_response(payload,conversation_history)
#     if not result:
#         print("Invalid Input!")
#     else:
#         print(agent.format_message_history(result))
#     conversation_history += result
    












