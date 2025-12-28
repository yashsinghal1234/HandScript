# AI Feature Setup Guide

## Prerequisites

1. Node.js v18 or higher (for built-in fetch support)
2. An AI API key (OpenAI, Anthropic, or custom service)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Install AI Service Package (Choose one)

**For OpenAI:**
```bash
npm install openai
```

**For Anthropic Claude:**
```bash
npm install @anthropic-ai/sdk
```

**For Custom AI Service:**
No additional package needed, but configure your API endpoint in `.env`

### 3. Create Environment File

Create a `.env` file in the root directory with the following:

```env
# AI Service Type: 'openai', 'anthropic', or 'custom'
AI_SERVICE_TYPE=openai

# Your AI API Key
AI_API_KEY=your_api_key_here

# For OpenAI (optional, defaults to gpt-3.5-turbo)
OPENAI_MODEL=gpt-3.5-turbo

# For Anthropic (optional, defaults to claude-3-sonnet-20240229)
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# For Custom AI Service
# CUSTOM_AI_URL=https://api.example.com/v1/chat
# CUSTOM_AI_HEADERS={"X-Custom-Header": "value"}
# CUSTOM_AI_BODY={"model": "custom-model"}

# Backend Server Port (optional, defaults to 3001)
PORT=3001
```

### 4. Start the Backend Server

In one terminal:
```bash
npm run server
```

The backend will run on `http://localhost:3001`

### 5. Start the Frontend Server

In another terminal:
```bash
npm run dev
```

The frontend will run on `http://localhost:5000`

## Usage

1. Open `http://localhost:5000` in your browser
2. Click the "Ask AI" button
3. Enter your question in the modal
4. Click "Generate Answers" to get 3 AI-generated answers
5. Select your preferred answer
6. Click "Add Selected Answer to Page"
7. The question and answer will be formatted and added to the handwriting input area
8. Generate your handwriting image as usual

## Troubleshooting

### Backend not connecting
- Make sure the backend server is running on port 3001
- Check that `AI_API_KEY` is set in your `.env` file
- Verify the AI service package is installed

### API errors
- Verify your API key is correct
- Check that you have sufficient API credits/quota
- For custom services, verify the endpoint URL and request format

### Modal not opening
- Check browser console for JavaScript errors
- Ensure `js/ai-modal.mjs` is loaded correctly
- Verify the "Ask AI" button has the correct ID

