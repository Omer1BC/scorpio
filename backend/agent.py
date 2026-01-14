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
            resp = self.llm.invoke(state["messages"])
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
    def get_response(self,payload,history=[]):
        if not payload["data"] or payload["data"] == "exit" :
            return []
        else:
            try:
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

                else:
                    snapshot = self.agent.get_state(payload["config"])

                    if payload["data"] == "Disapprove":
                        decline = [ToolMessage(
                                    content="Tool execution was denied by the user.",
                                    tool_call_id=tool["id"]
                                )
                            for tool in snapshot.values["messages"][-1].tool_calls]

                        self.agent.update_state(payload["config"], {"messages": decline})
                        extended = []
                        for event in self.agent.stream(None, payload["config"], stream_mode="updates"):
                            for _,update in event.items():
                                if "messages" in update: extended.extend(update["messages"])           
                            last_event = event
                        return extended
                    else:
                        extended = []
                        for event in self.agent.stream(None, payload["config"], stream_mode="updates"):
                            for _,update in event.items():
                                if "messages" in update: extended.extend(update["messages"]) 
                            last_event = event
                        return extended

            except Exception as e:
                error_msg = f"Error occurred: {str(e)}"
                return [AIMessage(content=error_msg)]
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
    












