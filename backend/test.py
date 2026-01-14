"""
Interactive CLI for testing the agent with tool approval using modern LangGraph
Run: python test.py
"""
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langchain.tools import tool
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Define tools
@tool
def add(x: int, y: int) -> str:
    '''A tool that adds 2 numbers and returns their sum as a string result'''
    return str(x + y)

# Initialize LLM with tools bound
llm = ChatOpenAI(model="gpt-4o-mini")
tools = [add]
llm_with_tools = llm.bind_tools(tools)

# Define the agent function
def call_model(state: MessagesState):
    """Call the LLM with the current messages"""
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

# Define routing logic
def should_continue(state: MessagesState):
    """Determine if we should continue to tools or end"""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

# Build the graph
workflow = StateGraph(MessagesState)

# Add nodes
workflow.add_node("agent", call_model)
workflow.add_node("tools", ToolNode(tools))

# Add edges
workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", should_continue, ["tools", END])
workflow.add_edge("tools", "agent")

# Compile with checkpointer and interrupt before tools
memory = MemorySaver()
agent = workflow.compile(checkpointer=memory, interrupt_before=["tools"])


def format_message_history(response) -> str:
    """Format the agent's message history into a readable string"""
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

    return "\n".join(formatted_history)


def main():
    """Interactive CLI for testing the agent with tool approval"""
    print("=" * 60)
    print("🤖 Agent Testing CLI with Tool Approval")
    print("=" * 60)
    print("Type your messages to interact with the agent.")
    print("You'll be asked to approve tool executions.")
    print("Type 'exit' or 'quit' to end the session.")
    print("Type 'clear' to clear conversation history.")
    print("=" * 60)
    print()

    # Maintain conversation history and thread config
    conversation_history = []
    thread_config = {"configurable": {"thread_id": "1"}}

    while True:
        # Get user input
        user_input = input("You: ").strip()

        if not user_input:
            continue

        # Check for exit commands
        if user_input.lower() in ['exit', 'quit']:
            print("\n👋 Goodbye!")
            break

        # Check for clear command
        if user_input.lower() == 'clear':
            conversation_history = []
            thread_config = {"configurable": {"thread_id": "1"}}
            print("\n🗑️  Conversation history cleared.\n")
            continue

        # Create user message
        user_message = HumanMessage(content=user_input)
        conversation_history.append(user_message)

        try:
            # Stream agent execution and capture the last event
            # stream_mode="values" yields the full state after each node execution
            last_event = None
            for event in agent.stream({"messages": conversation_history}, thread_config, stream_mode="values"):
                # Each event contains the state with updated messages
                last_event = event

            # Get the current state to check for interrupts
            snapshot = agent.get_state(thread_config)
            print("interrupt",event["__interrupt__"])
            # Check if agent is interrupted before tools
            if snapshot.next:
                # Display current state from the last stream event
                print("\n" + "─" * 60)
                if last_event:
                    print(format_message_history(last_event))
                print("─" * 60)

                # Get the pending tool calls
                last_message = snapshot.values["messages"][-1]

                if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                    print("\n" + "⚠️" * 30)
                    print("🔧 Agent wants to execute the following tools:")
                    for tool_call in last_message.tool_calls:
                        tool_name = tool_call.get('name', 'unknown')
                        tool_args = tool_call.get('args', {})
                        print(f"   • {tool_name}({tool_args})")

                    approval = input("\n   Approve these tool calls? (y/n): ").strip().lower()

                    if approval == 'y':
                        print("   ✅ Tools approved. Executing...\n")
                        # Continue execution by passing None (approve) and print updates
                        for event in agent.stream(None, thread_config, stream_mode="values"):
                            last_event = event
                    else:
                        print("   ❌ Tools denied by user.\n")

                        # Official LangGraph pattern: Create ToolMessages for each denied tool call
                        tool_messages = [
                            ToolMessage(
                                content="Tool execution was denied by the user.",
                                tool_call_id=tool_call["id"]
                            )
                            for tool_call in last_message.tool_calls
                        ]

                        # Update the state with denial messages
                        agent.update_state(thread_config, {"messages": tool_messages})

                        # Continue execution - agent will respond to the denial
                        print("   Agent responding to denial...\n")
                        for event in agent.stream(None, thread_config, stream_mode="values"):
                            last_event = event

            # Display final state using the last stream event
            print("\n" + "─" * 60)
            if last_event:
                print(format_message_history(last_event))
            print("─" * 60 + "\n")

            # Update conversation history from the last event
            if last_event and "messages" in last_event:
                conversation_history = last_event["messages"]

        except Exception as e:
            print(f"\n❌ Error: {str(e)}\n")


if __name__ == "__main__":
    main()
