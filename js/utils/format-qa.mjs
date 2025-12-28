/**
 * Format Question and Answer utility
 * Formats Q&A text before inserting into the page
 */

/**
 * Format question and answer into a readable format
 * @param {string} question - The user's question
 * @param {string} answer - The selected answer
 * @returns {string} Formatted Q&A text
 */
export function formatQuestionAnswer(question, answer) {
  const formattedQuestion = question.trim();
  const formattedAnswer = answer.trim();

  // Format as Q: question\n\nA: answer
  return `Q: ${formattedQuestion}\n\nA: ${formattedAnswer}`;
}

/**
 * Insert formatted Q&A into the paper content area
 * @param {string} question - The user's question
 * @param {string} answer - The selected answer
 */
export function insertQuestionAnswerToPage(question, answer) {
  const paperContentEl = document.querySelector(".page-a .paper-content");

  if (!paperContentEl) {
    throw new Error("Paper content element not found");
  }

  // Get existing content
  const existingHTML = paperContentEl.innerHTML || "";

  // Add spacing if there's existing content (two line breaks before new Q&A)
  const separator = existingHTML.trim() ? "<br><br>" : "";

  // Create formatted Q&A with colors - question on one line, answer on next line
  const formattedQuestion = question.trim();
  const formattedAnswer = answer.trim();

  const newContent = `${separator}<span style="color: black;">Q: ${escapeHtml(
    formattedQuestion
  )}</span><br><span style="color: blue;">A: ${escapeHtml(
    formattedAnswer
  )}</span>`;

  // Insert the formatted Q&A
  paperContentEl.innerHTML = existingHTML + newContent;

  // Trigger input event to ensure any listeners are notified
  const event = new Event("input", { bubbles: true });
  paperContentEl.dispatchEvent(event);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
