import { generateAnswers } from "./utils/ai-service.mjs";
import { insertQuestionAnswerToPage } from "./utils/format-qa.mjs";

let modal,
  modalOverlay,
  questionInput,
  generateBtn,
  answersContainer,
  addToPageBtn,
  closeBtn,
  loadingSpinner;

let currentQuestion = "";
let currentAnswers = [];
let selectedAnswerIndex = -1;

// Initialize DOM elements
function initElements() {
  modal = document.querySelector("#ai-modal");
  modalOverlay = document.querySelector("#ai-modal-overlay");
  questionInput = document.querySelector("#ai-question-input");
  generateBtn = document.querySelector("#ai-generate-btn");
  answersContainer = document.querySelector("#ai-answers-container");
  addToPageBtn = document.querySelector("#ai-add-to-page-btn");
  closeBtn = document.querySelector("#ai-modal-close");
  loadingSpinner = document.querySelector("#ai-loading");
}

/**
 * Open the AI modal
 */
export function openAIModal() {
  if (!modal) {
    initElements();
  }
  if (!modal) {
    console.error("AI modal element not found");
    return;
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  // Focus on question input
  setTimeout(() => {
    questionInput?.focus();
  }, 100);
}

/**
 * Close the AI modal
 */
export function closeAIModal() {
  if (!modal) return;

  modal.classList.remove("active");
  document.body.style.overflow = "";

  // Reset state
  resetModal();
}

/**
 * Reset modal to initial state
 */
function resetModal() {
  currentQuestion = "";
  currentAnswers = [];
  selectedAnswerIndex = -1;

  if (questionInput) questionInput.value = "";
  if (answersContainer) answersContainer.innerHTML = "";
  if (addToPageBtn) addToPageBtn.disabled = true;
  if (generateBtn) generateBtn.disabled = false;
  if (loadingSpinner) loadingSpinner.style.display = "none";
}

/**
 * Handle question submission
 */
export async function handleQuestionSubmit() {
  const question = questionInput?.value.trim();

  if (!question) {
    alert("Please enter a question");
    return;
  }

  currentQuestion = question;

  // Show loading state
  if (loadingSpinner) loadingSpinner.style.display = "block";
  if (generateBtn) generateBtn.disabled = true;
  if (answersContainer) answersContainer.innerHTML = "";
  if (addToPageBtn) addToPageBtn.disabled = true;
  selectedAnswerIndex = -1;

  try {
    const answers = await generateAnswers(question);
    currentAnswers = answers;
    displayAnswers(answers);
  } catch (error) {
    console.error("Error generating answers:", error);

    // Show user-friendly error messages
    let errorMessage = error.message;
    if (errorMessage.includes("quota")) {
      errorMessage =
        "API quota exceeded. Please check your OpenAI account billing and plan.";
    } else if (errorMessage.includes("API key")) {
      errorMessage =
        "Invalid API key. Please check your .env file configuration.";
    } else if (errorMessage.includes("payment")) {
      errorMessage =
        "Payment required. Please add a payment method to your OpenAI account.";
    } else if (errorMessage.includes("connect")) {
      errorMessage =
        "Cannot connect to AI service. Make sure the backend server is running on port 3001.";
    }

    alert(`Error: ${errorMessage}`);
    if (loadingSpinner) loadingSpinner.style.display = "none";
    if (generateBtn) generateBtn.disabled = false;
  }
}

/**
 * Display the generated answers
 * @param {Array<string>} answers - Array of answer strings
 */
export function displayAnswers(answers) {
  if (!answersContainer) return;

  if (loadingSpinner) loadingSpinner.style.display = "none";
  if (generateBtn) generateBtn.disabled = false;

  if (!answers || answers.length === 0) {
    answersContainer.innerHTML =
      '<p style="color: var(--text-color, #333);">No answers generated.</p>';
    return;
  }

  answersContainer.innerHTML = answers
    .map(
      (answer, index) => `
        <div class="ai-answer-card" data-index="${index}">
          <div class="ai-answer-number">Answer ${index + 1}</div>
          <div class="ai-answer-text">${escapeHtml(answer)}</div>
          <button class="ai-select-btn" data-index="${index}">Select This Answer</button>
        </div>
      `
    )
    .join("");

  // Add click listeners to answer cards and select buttons
  answersContainer
    .querySelectorAll(".ai-answer-card, .ai-select-btn")
    .forEach((element) => {
      element.addEventListener("click", (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        if (!isNaN(index)) {
          handleAnswerSelection(index);
        }
      });
    });
}

/**
 * Handle answer selection
 * @param {number} index - Index of selected answer
 */
export function handleAnswerSelection(index) {
  if (index < 0 || index >= currentAnswers.length) return;

  selectedAnswerIndex = index;

  // Update UI to show selected answer
  const answerCards = answersContainer.querySelectorAll(".ai-answer-card");
  answerCards.forEach((card, i) => {
    if (i === index) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  // Enable "Add to Page" button
  if (addToPageBtn) addToPageBtn.disabled = false;
}

/**
 * Insert selected Q&A to the page
 */
export function insertToPage() {
  if (selectedAnswerIndex < 0 || !currentAnswers[selectedAnswerIndex]) {
    alert("Please select an answer first");
    return;
  }

  try {
    insertQuestionAnswerToPage(
      currentQuestion,
      currentAnswers[selectedAnswerIndex]
    );
    closeAIModal();

    // Optional: Show success message
    const successMsg = document.createElement("div");
    successMsg.textContent = "Question and answer added to page!";
    successMsg.style.cssText =
      "position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 5px; z-index: 10000;";
    document.body.appendChild(successMsg);

    setTimeout(() => {
      successMsg.remove();
    }, 3000);
  } catch (error) {
    console.error("Error inserting to page:", error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize event listeners
document.addEventListener("DOMContentLoaded", () => {
  initElements();

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", closeAIModal);
  }

  // Overlay click to close
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeAIModal();
      }
    });
  }

  // Generate button
  if (generateBtn) {
    generateBtn.addEventListener("click", handleQuestionSubmit);
  }

  // Enter key in question input
  if (questionInput) {
    questionInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        handleQuestionSubmit();
      }
    });
  }

  // Add to page button
  if (addToPageBtn) {
    addToPageBtn.addEventListener("click", insertToPage);
  }

  // ESC key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("active")) {
      closeAIModal();
    }
  });
});
