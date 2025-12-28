const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// AI API endpoint
app.post('/api/ai/generate-answers', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get AI service type from environment (default to 'gemini')
    const aiService = process.env.AI_SERVICE_TYPE || 'gemini';
    console.log(`\n=== AI Request ===`);
    console.log(`Service: ${aiService}`);
    console.log(`Question: ${question.substring(0, 100)}...`);

    let answers = [];

    if (aiService === 'ollama') {
      answers = await generateOllamaAnswers(question);
    } else {
      // Only require API key for external services
      const apiKey = process.env.AI_API_KEY;
      if (!apiKey) {
        console.error('ERROR: AI_API_KEY not found in environment');
        return res.status(500).json({ 
          error: 'AI API key not configured. Please set AI_API_KEY in .env file' 
        });
      }

      if (aiService === 'gemini') {
        console.log('Calling Gemini API...');
        answers = await generateGeminiAnswers(question, apiKey);
      } else if (aiService === 'openai') {
        console.log('Calling OpenAI API...');
        answers = await generateOpenAIAnswers(question, apiKey);
      } else if (aiService === 'anthropic') {
        console.log('Calling Anthropic API...');
        answers = await generateAnthropicAnswers(question, apiKey);
      } else if (aiService === 'cerebras') {
        console.log('Calling Cerebras AI...');
        answers = await generateCerebrasAnswers(question, apiKey);
      } else {
        return res.status(400).json({ error: 'Invalid AI service type. Use: ollama, gemini, openai, anthropic, or cerebras' });
      }
    }

    if (!answers || answers.length === 0) {
      console.error('ERROR: No answers generated');
      return res.status(500).json({ error: 'Failed to generate answers' });
    }

    // Ensure we have exactly 3 answers
    while (answers.length < 3) {
      answers.push(answers[answers.length - 1] || 'No additional answer available');
    }

    console.log(`✓ Successfully generated ${answers.length} answers`);
    console.log('=== End Request ===\n');

    res.json({ answers: answers.slice(0, 3) });
  } catch (error) {
    console.error('\n!!! ERROR in generate-answers endpoint !!!');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    console.error('=== End Error ===\n');
    
    res.status(500).json({ 
      error: 'Failed to generate answers',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Ollama (Local AI) implementation
async function generateOllamaAnswers(question) {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama2'; // or 'mistral', 'codellama', etc.

  const prompt = `Please provide exactly 3 different, well-written answers to the following question. Format your response as follows:

Answer 1: [first answer here]
Answer 2: [second answer here]
Answer 3: [third answer here]

Make each answer distinct, complete, and well-structured.

Question: ${question}`;

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1000
        }
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Model "${model}" not found. Please install it with: ollama pull ${model}`);
      }
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.response || '';

    // Parse the response into 3 answers
    return parseAnswers(aiResponse);
  } catch (error) {
    if (error.message.includes('fetch') || error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Ollama. Make sure Ollama is installed and running. Download from https://ollama.ai');
    }
    throw error;
  }
}

// Shared parsing function for all AI responses
function parseAnswers(response) {
  let answers = [];
  
  // Method 1: Look for "Answer 1:", "Answer 2:", "Answer 3:" pattern
  const answerPattern = /Answer\s*[123]:?\s*(.+?)(?=Answer\s*[123]:|$)/gis;
  const matches = [...response.matchAll(answerPattern)];
  if (matches.length >= 3) {
    answers = matches.slice(0, 3).map(m => m[1].trim()).filter(a => a.length > 10);
  }
  
  // Method 2: Look for numbered lists (1., 2., 3.)
  if (answers.length < 3) {
    const numberedPattern = /^\s*[123]\.\s*(.+?)(?=^\s*[123]\.|$)/gims;
    const numberedMatches = [...response.matchAll(numberedPattern)];
    if (numberedMatches.length >= 3) {
      answers = numberedMatches.slice(0, 3).map(m => m[1].trim()).filter(a => a.length > 10);
    }
  }
  
  // Method 3: Split by double newlines (paragraphs)
  if (answers.length < 3) {
    const paragraphs = response.split(/\n\n+/).filter(p => {
      const trimmed = p.trim();
      return trimmed.length > 20 && !trimmed.match(/^(Answer|Option)\s*[123]/i);
    });
    if (paragraphs.length >= 3) {
      answers = paragraphs.slice(0, 3).map(p => p.trim());
    }
  }
  
  // Method 4: Split by single newlines if they're substantial
  if (answers.length < 3) {
    const lines = response.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 30 && !trimmed.match(/^(Answer|Option|Question)/i);
    });
    if (lines.length >= 3) {
      answers = lines.slice(0, 3).map(l => l.trim());
    }
  }
  
  // If still no good answers, use the whole response split intelligently
  if (answers.length === 0) {
    const fallback = response.trim();
    if (fallback.length > 50) {
      // Split into roughly equal parts
      const partLength = Math.floor(fallback.length / 3);
      answers = [
        fallback.substring(0, partLength).trim(),
        fallback.substring(partLength, partLength * 2).trim(),
        fallback.substring(partLength * 2).trim()
      ].filter(a => a.length > 10);
    }
  }

  // Ensure we have at least 3 answers (duplicate if needed)
  while (answers.length < 3 && answers.length > 0) {
    answers.push(answers[answers.length - 1]);
  }
  
  // If still no answers, return error
  if (answers.length === 0) {
    throw new Error('Could not parse answers from AI response');
  }

  return answers.slice(0, 3);
}

// OpenAI implementation
async function generateOpenAIAnswers(question, apiKey) {
  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch (error) {
    throw new Error('OpenAI package not installed. Run: npm install openai');
  }
  const openai = new OpenAI({ apiKey });

  const prompt = `Please provide exactly 3 different, well-written answers to the following question. Format your response as follows:

Answer 1: [first answer here]
Answer 2: [second answer here]
Answer 3: [third answer here]

Make each answer distinct, complete, and well-structured.

Question: ${question}`;

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Always format your responses with "Answer 1:", "Answer 2:", and "Answer 3:" labels.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });
  } catch (apiError) {
    if (apiError.status === 429) {
      throw new Error('OpenAI API quota exceeded. Please check your billing and plan at https://platform.openai.com/account/billing');
    } else if (apiError.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your API key in the .env file.');
    } else if (apiError.status === 402) {
      throw new Error('OpenAI account payment required. Please add a payment method at https://platform.openai.com/account/billing');
    } else {
      throw new Error(`OpenAI API error: ${apiError.message || 'Unknown error'}`);
    }
  }

  const response = completion.choices[0].message.content;
  console.log('OpenAI Response:', response.substring(0, 200) + '...');
  
  return parseAnswers(response);
}

// Shared parsing function for all AI responses
function parseAnswers(response) {
  let answers = [];
  
  // Method 1: Look for "Answer 1:", "Answer 2:", "Answer 3:" pattern
  const answerPattern = /Answer\s*[123]:?\s*(.+?)(?=Answer\s*[123]:|$)/gis;
  const matches = [...response.matchAll(answerPattern)];
  if (matches.length >= 3) {
    answers = matches.slice(0, 3).map(m => m[1].trim()).filter(a => a.length > 10);
  }
  
  // Method 2: Look for numbered lists (1., 2., 3.)
  if (answers.length < 3) {
    const numberedPattern = /^\s*[123]\.\s*(.+?)(?=^\s*[123]\.|$)/gims;
    const numberedMatches = [...response.matchAll(numberedPattern)];
    if (numberedMatches.length >= 3) {
      answers = numberedMatches.slice(0, 3).map(m => m[1].trim()).filter(a => a.length > 10);
    }
  }
  
  // Method 3: Split by double newlines (paragraphs)
  if (answers.length < 3) {
    const paragraphs = response.split(/\n\n+/).filter(p => {
      const trimmed = p.trim();
      return trimmed.length > 20 && !trimmed.match(/^(Answer|Option)\s*[123]/i);
    });
    if (paragraphs.length >= 3) {
      answers = paragraphs.slice(0, 3).map(p => p.trim());
    }
  }
  
  // Method 4: Split by single newlines if they're substantial
  if (answers.length < 3) {
    const lines = response.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 30 && !trimmed.match(/^(Answer|Option|Question)/i);
    });
    if (lines.length >= 3) {
      answers = lines.slice(0, 3).map(l => l.trim());
    }
  }
  
  // If still no good answers, use the whole response split intelligently
  if (answers.length === 0) {
    const fallback = response.trim();
    if (fallback.length > 50) {
      // Split into roughly equal parts
      const partLength = Math.floor(fallback.length / 3);
      answers = [
        fallback.substring(0, partLength).trim(),
        fallback.substring(partLength, partLength * 2).trim(),
        fallback.substring(partLength * 2).trim()
      ].filter(a => a.length > 10);
    }
  }

  // Ensure we have at least 3 answers (duplicate if needed)
  while (answers.length < 3 && answers.length > 0) {
    answers.push(answers[answers.length - 1]);
  }
  
  // If still no answers, return error
  if (answers.length === 0) {
    throw new Error('Could not parse answers from AI response');
  }

  return answers.slice(0, 3);
}

// Anthropic Claude implementation
async function generateAnthropicAnswers(question, apiKey) {
  let Anthropic;
  try {
    Anthropic = require('@anthropic-ai/sdk');
  } catch (error) {
    throw new Error('Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk');
  }
  const anthropic = new Anthropic({ apiKey });

  const prompt = `Please provide exactly 3 different, well-written answers to the following question. Format your response as follows:

Answer 1: [first answer here]
Answer 2: [second answer here]
Answer 3: [third answer here]

Make each answer distinct, complete, and well-structured.

Question: ${question}`;

  let message;
  try {
    message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: 1500,
      messages: [
        { role: 'user', content: prompt }
      ]
    });
  } catch (apiError) {
    if (apiError.status === 429) {
      throw new Error('Anthropic API rate limit exceeded. Please try again later or check your plan.');
    } else if (apiError.status === 401) {
      throw new Error('Invalid Anthropic API key. Please check your API key in the .env file.');
    } else if (apiError.status === 402) {
      throw new Error('Anthropic account payment required. Please add a payment method.');
    } else {
      throw new Error(`Anthropic API error: ${apiError.message || 'Unknown error'}`);
    }
  }

  const response = message.content[0].text;
  
  return parseAnswers(response);
}

// Cerebras AI implementation (OpenAI-compatible API)
async function generateCerebrasAnswers(question, apiKey) {
  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch (error) {
    throw new Error('OpenAI package not installed. Run: npm install openai');
  }
  
  const cerebras = new OpenAI({ 
    apiKey: apiKey,
    baseURL: 'https://api.cerebras.ai/v1'
  });

  const prompt = `Please provide exactly 3 different, well-written answers to the following question. Format your response as follows:

Answer 1: [first answer here]
Answer 2: [second answer here]
Answer 3: [third answer here]

Make each answer distinct, complete, and well-structured.

Question: ${question}`;

  let completion;
  try {
    completion = await cerebras.chat.completions.create({
      model: process.env.CEREBRAS_MODEL || 'llama3.1-8b',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Always format your responses with "Answer 1:", "Answer 2:", and "Answer 3:" labels.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });
  } catch (apiError) {
    console.error('Cerebras API Error Details:', apiError);
    console.error('Status:', apiError.status);
    console.error('Response:', apiError.response?.data);
    
    if (apiError.status === 429) {
      throw new Error('Cerebras API rate limit exceeded. Please try again later.');
    } else if (apiError.status === 401 || apiError.status === 403) {
      throw new Error('Invalid Cerebras API key. Please check your API key in the .env file.');
    } else if (apiError.status === 402) {
      throw new Error('Cerebras account payment required. Please check your account.');
    } else if (apiError.message) {
      throw new Error(`Cerebras API error: ${apiError.message}`);
    } else {
      throw new Error(`Cerebras API error: ${JSON.stringify(apiError.response?.data || 'Unknown error')}`);
    }
  }

  const response = completion.choices[0].message.content;
  console.log('Cerebras Response:', response.substring(0, 200) + '...');
  
  return parseAnswers(response);
}

// Google Gemini implementation
async function generateGeminiAnswers(question, apiKey) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Use the model name without the version prefix
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  console.log(`Using Gemini model: ${modelName}`);
  
  const model = genAI.getGenerativeModel({ 
    model: modelName
  });

  const prompt = `Please provide exactly 3 different, well-written answers to the following question. Format your response as follows:

Answer 1: [first answer here]
Answer 2: [second answer here]
Answer 3: [third answer here]

Make each answer distinct, complete, and well-structured.

Question: ${question}`;

  let result;
  try {
    // Use generateContent method
    result = await model.generateContent(prompt);
    
    // Check if the response was blocked or empty
    if (!result || !result.response) {
      throw new Error('No response received from Gemini API');
    }
    
    const response = result.response;
    
    // Check for safety ratings that might block the content
    if (response.promptFeedback && response.promptFeedback.blockReason) {
      throw new Error(`Content blocked by Gemini: ${response.promptFeedback.blockReason}`);
    }
    
  } catch (apiError) {
    console.error('Gemini API Error Details:', apiError);
    
    // Handle different error types
    if (apiError.message && apiError.message.includes('blocked')) {
      throw apiError;
    } else if (apiError.message && apiError.message.includes('API key')) {
      throw new Error('Invalid or inactive Gemini API key. Please verify your API key at https://makersuite.google.com/app/apikey');
    } else if (apiError.status === 404) {
      throw new Error(`Model ${modelName} not found. Try using: gemini-pro, gemini-1.5-pro, gemini-1.5-flash-latest, or gemini-1.0-pro`);
    } else if (apiError.status === 429) {
      throw new Error('Gemini API rate limit exceeded. Please try again later or check your quota.');
    } else if (apiError.status === 401 || apiError.status === 403) {
      throw new Error('Invalid Gemini API key. Please check your API key in the .env file.');
    } else if (apiError.status === 400) {
      throw new Error(`Gemini API error: ${apiError.message || 'Invalid request'}`);
    } else if (apiError.message) {
      throw new Error(`Gemini API error: ${apiError.message}`);
    } else {
      throw new Error(`Gemini API error: Unknown error occurred`);
    }
  }

  try {
    const response = result.response;
    const text = response.text();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response received from Gemini');
    }
    
    console.log('Gemini Response:', text.substring(0, 200) + '...');
    
    return parseAnswers(text);
  } catch (parseError) {
    console.error('Error parsing Gemini response:', parseError);
    throw new Error(`Failed to parse Gemini response: ${parseError.message}`);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'text-to-handwriting-api' });
});

app.listen(PORT, () => {
  console.log(`AI Backend server running on http://localhost:${PORT}`);
  console.log(`AI Service Type: ${process.env.AI_SERVICE_TYPE || 'gemini'}`);
});

