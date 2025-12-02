<<<<<<< HEAD
# Importing necessary libraries
import base64
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import HumanMessage
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

# Loading environment variables and OpenAI API key
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initializing LLM and embeddings (will be None if API key not set)
llm = None
embeddings = None

if OPENAI_API_KEY:
    llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=OPENAI_API_KEY)
    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)

# Load or create vector store from PDF documents
def load_vectorstore(path):
    pdf_path = path
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()

    # Spliting documents into chunks
    splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)
    chunks = splitter.split_documents(docs)

    # Build FAISS vector store
    vectorstore = FAISS.from_documents(chunks, embeddings)
    return vectorstore

# Dictionary for user chat sessions
sessions = {}

# ---------------------- REPORT GENERATION MODULE -----------------------
# Function to encode image to base64
def encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

# Function to generate defect report using LLM
def llm_report(perfect_image_path,defective_image_path,model_features=None):

    # Validate image paths
    if not os.path.exists(perfect_image_path) or not os.path.exists(defective_image_path):
        return {"response": "Error: One or both image paths are invalid."}
    
    perfect_b64 = encode_image(perfect_image_path) # Encode perfect image
    defective_b64 = encode_image(defective_image_path) # Encode defective image


    # Construct prompt for report generation of defective image
    prompt = (
        "You are an expert quality inspector for manufactured products.\n\n"

        "**Analyze two images:**\n"
        "1. Reference image: Perfect/acceptable product standard\n"
        "2. Defective image: Product under inspection (potentially defective)\n\n"

        "## Model Context\n"
        "The following defect features were identified by the classifier model:\n"
        "{model_features}\n"
        
        "## Instructions:\n"
        "- Systematically compare both images to identify deviations from the standard\n"
        "- Identify all visible differences or anomalies precisely expalin the anonalies found in defective image only.\n"
        "- Mention the defective features in the defective image only in the report and do not mention unavailable data\n"
        "- Focus your defect descriptions exclusively on anomalies found in the defective image\n"
        "- Suggest possible causes and quality control steps to avoid them in future productions\n"
        
        "**Provide the report in a clear, structured format suitable for quality control documentation.**\n"  
        "**Use clear, professional language suitable for quality control documentation and production team review.**"
    )

    # Generate report
    messages = [
        HumanMessage(
            content=[
                {"type": "text", "text": prompt.format(model_features=model_features or "N/A")},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{perfect_b64}"}},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{defective_b64}"}}
            ]
        )
    ]

    response = llm.invoke(messages) # Get LLM response

    if not response or not response.content:
        return {"response": "Error: Failed to generate report."} # Check for empty response
    
    return {"response": response.content} # Return the generated report

# ---------------------- CHAT BOT MODULE ----------------------
# Pydantic model for chat request
class ChatRequest(BaseModel):
    session_id: str
    message: str

# Chat function to handle user queries with dynamic context
def chat(request: ChatRequest, db=None, user=None):

    if not request.session_id or not request.message:
        return {"response": "Error: session_id and message are required."} # Validate input

    # Check if LLM is available
    if not llm:
        return {
            "response": "The AI chatbot is currently unavailable. OpenAI API key is not configured. "
                       "Please contact your administrator to set up the OPENAI_API_KEY environment variable."
        }

    # Load static knowledge base
    from pathlib import Path
    knowledge_base_path = Path(__file__).parent.parent.parent / "data" / "knowledge_base.md"

    if not knowledge_base_path.exists():
        return {"response": "Error: Knowledge base not found. Please contact support."}

    with open(knowledge_base_path, 'r') as f:
        kb_content = f.read()

    # Build dynamic context if user and db session are provided
    if db and user:
        from app.services.context_builder import build_full_context
        context = build_full_context(db, user, kb_content)
    else:
        # Fallback to static knowledge base only
        context = kb_content

    session_id = request.session_id.strip() # Get session ID
    user_message = request.message.strip()  # Get user message

    # Enhanced system prompt with personalization
    user_name = user.full_name or user.username if user else "User"

    system_prompt = (
    f"You are Jemih, an AI assistant for QC Leap's manufacturing defect detection platform.\n\n"

    "## Your Mission\n"
    "Your primary role is to provide expert, personalized guidance on how to use the platform effectively.\n"

    "## Your Capabilities\n"
    "- Provide guidance on Application navigation and feature usage\n"
    "- Help interpret defect detection results and model performance metrics\n"
    "- Explain technical concepts (Copy-Paste augmentation, MobileNetV3, computer vision for quality control)\n"
    "- Answer questions about the user's specific models, training jobs, and data\n"
    "- Provide personalized recommendations based on the user's current status\n"

    "## IMPORTANT: You Have Access to Real-Time User Data\n"
    "The context provided includes LIVE information about:\n"
    "- The user's current models and their status\n"
    "- Active and historical training jobs\n"
    "- Image upload statistics\n"
    "- Model performance metrics (accuracy, precision, recall, F1 score)\n"
    "- Personalized system recommendations\n"
    "\n"
    "**USE THIS DATA to provide specific, actionable answers!**\n"
    "For example:\n"
    "- If user asks 'How many models do I have?', check the USER'S MODELS section in context\n"
    "- If user asks 'What's my best model?', check the PERFORMANCE SUMMARY section\n"
    "- If user asks 'Is my training done?', check the TRAINING STATUS section\n"
    "- Always reference specific model names, IDs, and metrics when available\n"

    "## Response Guidelines\n"
    f"- Address the user as '{user_name}' when appropriate\n"
    "- Be warm and professional - you're their personal AI assistant\n"
    "- Responses should be clear, concise, and jargon-free\n"
    "- Use the provided context as your primary knowledge source\n"
    "- Always refer to chat history for conversational context\n"
    "- When answering about their data, be SPECIFIC (use model names, numbers, dates)\n"
    "- If giving general platform guidance, use examples from their actual data when possible\n"

    "## Handling Queries\n"
    "**For queries about the user's data (models, training, images):**\n"
    "- Look in the 'USER INFORMATION', 'USER'S MODELS', 'TRAINING STATUS', 'IMAGE STATISTICS', and 'PERFORMANCE SUMMARY' sections\n"
    "- Provide specific, data-backed answers\n"
    "- Use exact numbers, model names, and metrics from the context\n"
    "\n"
    "**For general platform questions:**\n"
    "- Use the 'STATIC KNOWLEDGE BASE' section\n"
    "- Relate explanations to their specific situation when possible\n"
    "\n"
    "**For out-of-scope queries:**\n"
    "- Acknowledge the limitation honestly\n"
    "- Suggest related topics you can help with\n"
    "- Recommend contacting QC Leap support for specialized assistance\n\n"

    "Always maintain a professional, helpful tone that builds user confidence in the platform."
    )

    # Retrieve chat history
    chat_history = sessions.get(session_id, [])

    # Prompt construction along with context and chat history
    prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(system_prompt),
        HumanMessagePromptTemplate.from_template(
            "Context from knowledge base:\n{context}\n\nChat history:\n{history}\n\nUser: {question}\n\nAssistant:"
        )
    ])

    # Format prompt with context and history
    formatted_prompt = prompt.format(
        context=context,
        history="\n".join(chat_history[-5:]),  # last 5 messages from chat history
        question=user_message 
    )

    # Get response from LLM
    response = llm.invoke([HumanMessage(content=formatted_prompt)])

    # Update chat history
    chat_history.append(f"User: {user_message}")
    chat_history.append(f"Assistant: {response.content}")
    sessions[session_id] = chat_history

    if not response or not response.content:
        return {"response": "Error: Failed to generate chat response."} # Check for empty response

    # Return the chat reply
    return {"response": response.content}

=======
# Importing necessary libraries
import base64
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import HumanMessage
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

# Loading environment variables and OpenAI API key
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initializing LLM and embeddings (will be None if API key not set)
llm = None
embeddings = None

if OPENAI_API_KEY:
    llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=OPENAI_API_KEY)
    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)

# Load or create vector store from PDF documents
def load_vectorstore(path):
    pdf_path = path
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()

    # Spliting documents into chunks
    splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)
    chunks = splitter.split_documents(docs)

    # Build FAISS vector store
    vectorstore = FAISS.from_documents(chunks, embeddings)
    return vectorstore

# Dictionary for user chat sessions
sessions = {}

# ---------------------- REPORT GENERATION MODULE -----------------------
# Function to encode image to base64
def encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

# Function to generate defect report using LLM
def llm_report(perfect_image_path,defective_image_path,model_features=None):

    # Validate image paths
    if not os.path.exists(perfect_image_path) or not os.path.exists(defective_image_path):
        return {"response": "Error: One or both image paths are invalid."}
    
    perfect_b64 = encode_image(perfect_image_path) # Encode perfect image
    defective_b64 = encode_image(defective_image_path) # Encode defective image


    # Construct prompt for report generation of defective image
    prompt = (
        "You are an expert quality inspector for manufactured products.\n\n"

        "**Analyze two images:**\n"
        "1. Reference image: Perfect/acceptable product standard\n"
        "2. Defective image: Product under inspection (potentially defective)\n\n"

        "## Model Context\n"
        "The following defect features were identified by the classifier model:\n"
        "{model_features}\n"
        
        "## Instructions:\n"
        "- Systematically compare both images to identify deviations from the standard\n"
        "- Identify all visible differences or anomalies precisely expalin the anonalies found in defective image only.\n"
        "- Mention the defective features in the defective image only in the report and do not mention unavailable data\n"
        "- Focus your defect descriptions exclusively on anomalies found in the defective image\n"
        "- Suggest possible causes and quality control steps to avoid them in future productions\n"
        
        "**Provide the report in a clear, structured format suitable for quality control documentation.**\n"  
        "**Use clear, professional language suitable for quality control documentation and production team review.**"
    )

    # Generate report
    messages = [
        HumanMessage(
            content=[
                {"type": "text", "text": prompt.format(model_features=model_features or "N/A")},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{perfect_b64}"}},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{defective_b64}"}}
            ]
        )
    ]

    response = llm.invoke(messages) # Get LLM response

    if not response or not response.content:
        return {"response": "Error: Failed to generate report."} # Check for empty response
    
    return {"response": response.content} # Return the generated report

# ---------------------- CHAT BOT MODULE ----------------------
# Pydantic model for chat request
class ChatRequest(BaseModel):
    session_id: str
    message: str

# Chat function to handle user queries with dynamic context
def chat(request: ChatRequest, db=None, user=None):

    if not request.session_id or not request.message:
        return {"response": "Error: session_id and message are required."} # Validate input

    # Check if LLM is available
    if not llm:
        return {
            "response": "The AI chatbot is currently unavailable. OpenAI API key is not configured. "
                       "Please contact your administrator to set up the OPENAI_API_KEY environment variable."
        }

    # Load static knowledge base
    from pathlib import Path
    knowledge_base_path = Path(__file__).parent.parent.parent / "data" / "knowledge_base.md"

    if not knowledge_base_path.exists():
        return {"response": "Error: Knowledge base not found. Please contact support."}

    with open(knowledge_base_path, 'r') as f:
        kb_content = f.read()

    # Build dynamic context if user and db session are provided
    if db and user:
        from app.services.context_builder import build_full_context
        context = build_full_context(db, user, kb_content)
    else:
        # Fallback to static knowledge base only
        context = kb_content

    session_id = request.session_id.strip() # Get session ID
    user_message = request.message.strip()  # Get user message

    # Enhanced system prompt with personalization
    user_name = user.full_name or user.username if user else "User"

    system_prompt = (
    f"You are Jemih, an AI assistant for QC Leap's manufacturing defect detection platform.\n\n"

    "## Your Mission\n"
    "Your primary role is to provide expert, personalized guidance on how to use the platform effectively.\n"

    "## Your Capabilities\n"
    "- Provide guidance on Application navigation and feature usage\n"
    "- Help interpret defect detection results and model performance metrics\n"
    "- Explain technical concepts (Copy-Paste augmentation, MobileNetV3, computer vision for quality control)\n"
    "- Answer questions about the user's specific models, training jobs, and data\n"
    "- Provide personalized recommendations based on the user's current status\n"

    "## IMPORTANT: You Have Access to Real-Time User Data\n"
    "The context provided includes LIVE information about:\n"
    "- The user's current models and their status\n"
    "- Active and historical training jobs\n"
    "- Image upload statistics\n"
    "- Model performance metrics (accuracy, precision, recall, F1 score)\n"
    "- Personalized system recommendations\n"
    "\n"
    "**USE THIS DATA to provide specific, actionable answers!**\n"
    "For example:\n"
    "- If user asks 'How many models do I have?', check the USER'S MODELS section in context\n"
    "- If user asks 'What's my best model?', check the PERFORMANCE SUMMARY section\n"
    "- If user asks 'Is my training done?', check the TRAINING STATUS section\n"
    "- Always reference specific model names, IDs, and metrics when available\n"

    "## Response Guidelines\n"
    f"- Address the user as '{user_name}' when appropriate\n"
    "- Be warm and professional - you're their personal AI assistant\n"
    "- Responses should be clear, concise, and jargon-free\n"
    "- Use the provided context as your primary knowledge source\n"
    "- Always refer to chat history for conversational context\n"
    "- When answering about their data, be SPECIFIC (use model names, numbers, dates)\n"
    "- If giving general platform guidance, use examples from their actual data when possible\n"

    "## Handling Queries\n"
    "**For queries about the user's data (models, training, images):**\n"
    "- Look in the 'USER INFORMATION', 'USER'S MODELS', 'TRAINING STATUS', 'IMAGE STATISTICS', and 'PERFORMANCE SUMMARY' sections\n"
    "- Provide specific, data-backed answers\n"
    "- Use exact numbers, model names, and metrics from the context\n"
    "\n"
    "**For general platform questions:**\n"
    "- Use the 'STATIC KNOWLEDGE BASE' section\n"
    "- Relate explanations to their specific situation when possible\n"
    "\n"
    "**For out-of-scope queries:**\n"
    "- Acknowledge the limitation honestly\n"
    "- Suggest related topics you can help with\n"
    "- Recommend contacting QC Leap support for specialized assistance\n\n"

    "Always maintain a professional, helpful tone that builds user confidence in the platform."
    )

    # Retrieve chat history
    chat_history = sessions.get(session_id, [])

    # Prompt construction along with context and chat history
    prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(system_prompt),
        HumanMessagePromptTemplate.from_template(
            "Context from knowledge base:\n{context}\n\nChat history:\n{history}\n\nUser: {question}\n\nAssistant:"
        )
    ])

    # Format prompt with context and history
    formatted_prompt = prompt.format(
        context=context,
        history="\n".join(chat_history[-5:]),  # last 5 messages from chat history
        question=user_message 
    )

    # Get response from LLM
    response = llm.invoke([HumanMessage(content=formatted_prompt)])

    # Update chat history
    chat_history.append(f"User: {user_message}")
    chat_history.append(f"Assistant: {response.content}")
    sessions[session_id] = chat_history

    if not response or not response.content:
        return {"response": "Error: Failed to generate chat response."} # Check for empty response

    # Return the chat reply
    return {"response": response.content}

>>>>>>> mail-services
