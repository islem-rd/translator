// DOM elements
const sourceLanguageSelect = document.getElementById("sourceLanguage");
const targetLanguageSelect = document.getElementById("targetLanguage");
const sourceTextArea = document.getElementById("sourceText");
const targetTextArea = document.getElementById("targetText");
const translateButton = document.getElementById("translateBtn");
const swapButton = document.getElementById("swapBtn");
const statusElement = document.getElementById("status");
const speakButton = document.getElementById("speakBtn");
const characterCount = document.querySelector(".character-count");

// API key
const GEMINI_API_KEY = "AIzaSyDh_-i72kiAd7-L7rGapuvDa4Wzi4EEUj8";

// Check if speech synthesis is supported
const speechSynthesisSupported = "speechSynthesis" in window;

// Disable the button if speech synthesis is not supported
if (!speechSynthesisSupported) {
  speakButton.disabled = true;
  speakButton.title = "Speech synthesis is not supported by your browser";
}

// Event on page load
document.addEventListener("DOMContentLoaded", () => {
  // Focus on the source text area
  sourceTextArea.focus();
  
  // Initialize character count
  updateCharacterCount();
});

// Update character count
function updateCharacterCount() {
  const count = sourceTextArea.value.length;
  characterCount.textContent = count;
  
  // Change color based on count
  if (count > 1000) {
    characterCount.style.color = "var(--error-color)";
  } else if (count > 700) {
    characterCount.style.color = "var(--loading-color)";
  } else {
    characterCount.style.color = "var(--text-tertiary)";
  }
}

// Add event listener for character count
sourceTextArea.addEventListener("input", updateCharacterCount);

// Event for the language swap button
swapButton.addEventListener("click", () => {
  // Save current values
  const tempSourceLang = sourceLanguageSelect.value;
  const tempTargetLang = targetLanguageSelect.value;
  const tempSourceText = sourceTextArea.value;
  const tempTargetText = targetTextArea.value;

  // Swap languages
  sourceLanguageSelect.value = tempTargetLang;
  targetLanguageSelect.value = tempSourceLang;

  // Swap texts
  sourceTextArea.value = tempTargetText;
  targetTextArea.value = tempSourceText;
  
  // Update character count
  updateCharacterCount();
  
  // Add animation class
  swapButton.classList.add("swapping");
  setTimeout(() => {
    swapButton.classList.remove("swapping");
  }, 300);
});

// Event for the translation button
translateButton.addEventListener("click", () => {
  // Check source text
  const sourceText = sourceTextArea.value.trim();
  if (!sourceText) {
    showStatus("Please enter text to translate", "error");
    sourceTextArea.focus();
    return;
  }

  // Get selected languages
  const sourceLanguage = sourceLanguageSelect.value;
  const targetLanguage = targetLanguageSelect.value;

  // Display loading status
  showStatus("Translating...", "loading");

  // Call translation function
  translateText(sourceText, sourceLanguage, targetLanguage);
});

// Event for the speak button
speakButton.addEventListener("click", () => {
  const textToSpeak = targetTextArea.value.trim();

  // Check if text is empty
  if (!textToSpeak) {
    showStatus("No text to speak", "error");
    return;
  }

  // Read text aloud
  speakText(textToSpeak, targetLanguageSelect.value);
});

/**
 * Translates text using the Gemini API
 * @param {string} text - The text to translate
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 */
async function translateText(text, sourceLanguage, targetLanguage) {
  try {
    // Gemini API endpoint
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Create translation prompt
    const prompt = `Translate the following text from ${getLanguageName(sourceLanguage)} to ${getLanguageName(targetLanguage)}. 
    Return only the translated text without explanations or additional text: "${text}"`;

    // Request body
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
      },
    };

    // Send API request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Parse response
    const data = await response.json();

    // Check for errors
    if (data.error) {
      throw new Error(data.error.message || "Translation failed");
    }

    // Extract translated text
    const translatedText = data.candidates[0].content.parts[0].text;

    // Display translated text
    targetTextArea.value = translatedText;

    // Display success status
    showStatus("Translation complete!", "success");
  } catch (error) {
    console.error("Translation error:", error);
    showStatus(`Translation failed: ${error.message}`, "error");
  }
}

/**
 * Reads text aloud using the Web Speech API
 * @param {string} text - The text to read
 * @param {string} languageCode - The language code
 */
function speakText(text, languageCode) {
  // Check if speech synthesis is in progress
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    speakButton.classList.remove("speaking");
    return;
  }

  // Create a new SpeechSynthesisUtterance object
  const utterance = new SpeechSynthesisUtterance(text);

  // Set language
  utterance.lang = getVoiceLanguageCode(languageCode);

  // Start event
  utterance.onstart = () => {
    speakButton.classList.add("speaking");
  };

  // End event
  utterance.onend = () => {
    speakButton.classList.remove("speaking");
  };

  // Error event
  utterance.onerror = (event) => {
    console.error("Speech synthesis error:", event);
    speakButton.classList.remove("speaking");
    showStatus("Error during speech playback", "error");
  };

  // Select appropriate voice if available
  const voices = window.speechSynthesis.getVoices();
  const voiceForLanguage = voices.find(
    (voice) => voice.lang.startsWith(languageCode) || voice.lang.startsWith(getVoiceLanguageCode(languageCode))
  );

  if (voiceForLanguage) {
    utterance.voice = voiceForLanguage;
  }

  // Speak text
  window.speechSynthesis.speak(utterance);
}

/**
 * Converts language code to a code compatible with the SpeechSynthesis API
 * @param {string} code - The language code
 * @returns {string} The language code for speech synthesis
 */
function getVoiceLanguageCode(code) {
  const languageCodes = {
    en: "en-US",
    fr: "fr-FR",
    es: "es-ES",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-PT",
    ru: "ru-RU",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
  };

  return languageCodes[code] || code;
}

// Load available voices
function loadVoices() {
  window.speechSynthesis.getVoices();
}

// Load voices at startup
loadVoices();

// Some browsers require this event to load voices
if (speechSynthesisSupported) {
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

/**
 * Displays a status message
 * @param {string} message - The message to display
 * @param {string} type - The message type (error, success, loading)
 */
function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = "status-message";
  statusElement.classList.add(type);

  // Hide message after 5 seconds for success messages
  if (type === "success") {
    setTimeout(() => {
      statusElement.style.display = "none";
    }, 5000);
  }
}

/**
 * Gets the full language name from the code
 * @param {string} code - The language code
 * @returns {string} The full language name
 */
function getLanguageName(code) {
  const languages = {
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
  };

  return languages[code] || code;
}