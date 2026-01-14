# Agent API Backend

FastAPI backend with a `/agent` endpoint using Google Gemini 2.5 Flash.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file:
```bash
cp .env.example .env
```

5. Add your Google API key to the `.env` file:
```
GOOGLE_API_KEY=your_actual_api_key
```

## Running the Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### GET /
Health check endpoint

### POST /agent
Process messages using Gemini 2.5 Flash

**Request:**
```json
{
  "message": "Your question here"
}
```

**Response:**
```json
{
  "response": "LLM response here"
}
```

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
