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
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

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
import re
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.units import inch

def encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

# Function to generate defect report using LLM
def llm_report(perfect_image_path, defective_image_path, model_features=None):

    # Validate image paths
    if not os.path.exists(perfect_image_path) or not os.path.exists(defective_image_path):
        return {"response": "Error: One or both image paths are invalid."}
    
    perfect_b64 = encode_image(perfect_image_path)  # Encode perfect image
    defective_b64 = encode_image(defective_image_path)  # Encode defective image

    # Construct prompt for report generation of defective image
    prompt = (
        "You are an expert quality inspector for manufactured products.\n\n"

        "**Analyze two images:**\n"
        "1. Reference image: Perfect/acceptable product standard\n"
        "2. Defective image: Product under inspection (potentially defective)\n\n"

        "## Model Context\n"
        "The following defect features were identified by the classifier model:\n"
        "{model_features}\n\n"
        
        "## Instructions:\n"
        "- Systematically compare both images to identify deviations from the standard\n"
        "- Identify all visible differences or anomalies in the defective image\n"
        "- Precisely explain the anomalies found in the defective image only\n"
        "- Focus your defect descriptions exclusively on anomalies present in the defective image\n"
        "- Do not mention unavailable data or features not visible in the images\n\n"
        
        "## Required Report Structure:\n"
        "Please provide your analysis in the following structured format:\n\n"
        
        "### 1. EXECUTIVE SUMMARY\n"
        "- Overall quality assessment (Pass/Fail/Conditional)\n"
        "- Total number of defects identified\n"
        "- Severity classification (Critical/Major/Minor)\n\n"
        
        "### 2. DEFECT IDENTIFICATION\n"
        "For each defect found in the defective image:\n"
        "- **Defect Type:** [Name/category of the defect]\n"
        "- **Location:** [Specific area on the product]\n"
        "- **Description:** [Detailed explanation of the anomaly]\n"
        "- **Severity:** [Critical/Major/Minor]\n"
        "- **Visual Evidence:** [What specifically differs from the reference image]\n\n"
        
        "### 3. COMPARISON WITH REFERENCE STANDARD\n"
        "- Key differences observed between the defective and reference images\n"
        "- Specific deviations from acceptable quality standards\n\n"
        
        "### 4. ROOT CAUSE ANALYSIS\n"
        "For each identified defect:\n"
        "- **Probable Cause:** [Most likely manufacturing or process issue]\n"
        "- **Contributing Factors:** [Additional factors that may have led to the defect]\n\n"
        
        "### 5. CORRECTIVE ACTIONS\n"
        "- **Immediate Actions:** [Steps to address current defective product]\n"
        "- **Preventive Measures:** [Quality control improvements to prevent recurrence]\n"
        "- **Process Adjustments:** [Recommended changes to manufacturing process]\n\n"
        
        "### 6. QUALITY CONTROL RECOMMENDATIONS\n"
        "- Inspection checkpoints to be enhanced\n"
        "- Additional testing or validation steps\n"
        "- Monitoring parameters to track\n\n"
        
        "**Use clear, professional language suitable for quality control documentation and production team review.**\n"
        "**Ensure all observations are specific, measurable, and actionable.**"
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

    response = llm.invoke(messages)  # Get LLM response

    if not response or not response.content:
        return {"response": "Error: Failed to generate report."}  # Check for empty response
    
    return {"response": response.content}  # Return the generated report


# Function to convert markdown to ReportLab-friendly format
def markdown_to_reportlab(text: str, styles) -> list:
    """
    Convert markdown text to ReportLab Paragraph objects with proper formatting.
    """
    story = []
    lines = text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines
        if not line:
            story.append(Spacer(1, 6))
            i += 1
            continue
        
        # Handle headers (###, ##, #)
        if line.startswith('### '):
            text_content = line.replace('### ', '').strip()
            story.append(Spacer(1, 12))
            story.append(Paragraph(text_content, styles['Heading3']))
            story.append(Spacer(1, 6))
        elif line.startswith('## '):
            text_content = line.replace('## ', '').strip()
            story.append(Spacer(1, 14))
            story.append(Paragraph(text_content, styles['Heading2']))
            story.append(Spacer(1, 8))
        elif line.startswith('# '):
            text_content = line.replace('# ', '').strip()
            story.append(Spacer(1, 16))
            story.append(Paragraph(text_content, styles['Heading1']))
            story.append(Spacer(1, 10))
        
        # Handle bullet points
        elif line.startswith('- ') or line.startswith('* '):
            bullet_text = line[2:].strip()
            # Convert **bold** to <b>bold</b>
            bullet_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', bullet_text)
            # Convert *italic* to <i>italic</i>
            bullet_text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', bullet_text)
            story.append(Paragraph(f"• {bullet_text}", styles['Normal']))
        
        # Handle numbered lists
        elif re.match(r'^\d+\.\s', line):
            list_text = re.sub(r'^\d+\.\s', '', line).strip()
            # Convert **bold** to <b>bold</b>
            list_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', list_text)
            # Convert *italic* to <i>italic</i>
            list_text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', list_text)
            story.append(Paragraph(list_text, styles['Normal']))
        
        # Handle regular paragraphs
        else:
            # Convert **bold** to <b>bold</b>
            line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)
            # Convert *italic* to <i>italic</i>
            line = re.sub(r'\*(.*?)\*', r'<i>\1</i>', line)
            # Convert [text](url) to clickable links (basic handling)
            line = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', line)
            
            story.append(Paragraph(line, styles['Normal']))
        
        i += 1
    
    return story


# Function to generate PDF from text report
def generate_pdf_report(report_text: str, output_path: str, defective_image_path: str = None) -> str:
    """
    Generate a professionally formatted PDF report from markdown text.
    """
    try:
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Create custom styles
        styles = getSampleStyleSheet()
        
        # Title style
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=24,
            textColor='#1a1a1a',
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        # Heading styles
        h1_style = ParagraphStyle(
            'CustomHeading1',
            parent=styles['Heading1'],
            fontSize=16,
            textColor='#2c3e50',
            spaceAfter=12,
            spaceBefore=12,
            bold=True
        )
        
        h2_style = ParagraphStyle(
            'CustomHeading2',
            parent=styles['Heading2'],
            fontSize=14,
            textColor='#34495e',
            spaceAfter=10,
            spaceBefore=10,
            bold=True
        )
        
        h3_style = ParagraphStyle(
            'CustomHeading3',
            parent=styles['Heading3'],
            fontSize=12,
            textColor='#555555',
            spaceAfter=8,
            spaceBefore=8,
            bold=True
        )
        
        # Normal text style
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            textColor='#333333',
            spaceAfter=6,
            alignment=TA_LEFT
        )
        
        # Update styles dictionary
        styles.add(title_style)
        styles.add(h1_style)
        styles.add(h2_style)
        styles.add(h3_style)
        styles.add(normal_style)
        
        # Override default styles
        styles.byName['Title'] = title_style
        styles.byName['Heading1'] = h1_style
        styles.byName['Heading2'] = h2_style
        styles.byName['Heading3'] = h3_style
        styles.byName['Normal'] = normal_style
        
        story = []
        
        # Add report title
        story.append(Paragraph("Defect Inspection Report", styles['Title']))
        story.append(Spacer(1, 12))
        
        # Add timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        story.append(Paragraph(f"<i>Generated: {timestamp}</i>", styles['Normal']))
        story.append(Spacer(1, 20))

        # Add defective image if provided
        if defective_image_path and os.path.exists(defective_image_path):
            try:
                from reportlab.platypus import Image as ReportLabImage
                
                # Add a heading for the image
                story.append(Paragraph("Defective Image:", styles['Heading2']))
                story.append(Spacer(1, 10))
                
                # Load and resize image to fit page width (approx 6 inches)
                img = ReportLabImage(defective_image_path)
                
                # Calculate aspect ratio to fit within 6 inches width
                max_width = 6 * inch
                max_height = 4 * inch
                
                img_width = img.drawWidth
                img_height = img.drawHeight
                
                if img_width > max_width:
                    ratio = max_width / img_width
                    img.drawWidth = max_width
                    img.drawHeight = img_height * ratio
                
                # If still too tall, scale by height
                if img.drawHeight > max_height:
                    ratio = max_height / img.drawHeight
                    img.drawHeight = max_height
                    img.drawWidth = img.drawWidth * ratio
                    
                story.append(img)
                story.append(Spacer(1, 20))
            except Exception as e:
                print(f"Failed to add image to PDF: {e}")
                story.append(Paragraph(f"<i>[Error adding image: {e}]</i>", styles['Normal']))
                story.append(Spacer(1, 20))
        
        # Convert markdown to ReportLab format
        content_story = markdown_to_reportlab(report_text, styles)
        story.extend(content_story)
        
        # Build PDF
        doc.build(story)
        print(f"PDF report successfully generated: {output_path}")
        return output_path
        
    except Exception as e:
        print(f"Failed to generate PDF: {e}")
        import traceback
        traceback.print_exc()
        return None

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

