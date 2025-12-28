/**
 * AI Service Module
 * Handles communication with the backend AI API
 */

const API_BASE_URL = "http://localhost:3001";

/**
 * Generate answers for a given question
 * @param {string} question - The user's question
 * @returns {Promise<Array<string>>} Array of 3 answer strings
 */
export async function generateAnswers(question) {
  if (!question || question.trim() === "") {
    throw new Error("Question cannot be empty");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/generate-answers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: question.trim() }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (
      !data.answers ||
      !Array.isArray(data.answers) ||
      data.answers.length === 0
    ) {
      throw new Error("Invalid response format from AI service");
    }

    return data.answers;
  } catch (error) {
    if (error.message.includes("fetch")) {
      throw new Error(
        "Failed to connect to AI service. Make sure the backend server is running."
      );
    }
    throw error;
  }
}

/**
 * Check if the AI backend service is available
 * @returns {Promise<boolean>}
 */
export async function checkAIServiceHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}
