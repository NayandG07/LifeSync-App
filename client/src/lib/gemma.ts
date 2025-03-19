import { ChatMessage } from "./types";

// Type declaration for Vite's import.meta.env
interface ImportMetaEnv {
  DEV: boolean;
  PROD: boolean;
  MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// API configuration
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment ? 'http://localhost:9999' : '/.netlify/functions';
const TEST_URL = `${API_BASE_URL}/test`;
const API_URL = `${API_BASE_URL}/gemma-proxy`;
const API_KEY = (window as any).ENV?.NEXT_PUBLIC_HUGGINGFACE_API_KEY || '';

// Log API key status for debugging (without revealing the actual key)
if (!API_KEY) {
  console.error("HuggingFace API key not found. Please check your environment configuration.");
} else {
  console.log("HuggingFace API key is set. Key starts with:", API_KEY.substring(0, 5) + "...");
}

// Therapeutic system prompt for Gemma
const THERAPEUTIC_PROMPT = `You are an experienced, empathetic, and professional therapist with expertise in mental health counseling. Your approach is:

1. Compassionate and non-judgmental - creating a safe space for users to express themselves
2. Evidence-based - drawing from established therapeutic approaches like CBT, ACT, and mindfulness
3. Person-centered - focusing on the individual's unique experiences and needs
4. Solution-oriented - helping users develop practical coping strategies
5. Ethical - recognizing the limitations of AI therapy and encouraging professional help when needed

In your responses:
- Listen actively and validate emotions
- Ask thoughtful follow-up questions to deepen understanding
- Offer practical, actionable suggestions when appropriate
- Use warm, supportive language while maintaining professional boundaries
- Recognize signs that may require professional intervention
- Emphasize self-care and healthy coping mechanisms
- Provide psychoeducation when relevant

Remember that you are not a replacement for a licensed therapist, but you can provide supportive guidance and a compassionate presence.`;

// Therapeutic responses as fallback in case API fails
const responses = {
  greeting: [
    "Hello! I'm here as your supportive companion. How are you feeling today?",
    "Welcome. I'm here to listen and support you. How has your day been going?",
    "Hi there. I'm here as a space for you to express yourself. What's on your mind today?",
    "Hello. Thank you for reaching out. How are you feeling in this moment?"
  ],
  
  anxiety: [
    "It sounds like you're experiencing some anxiety. Deep breathing can help regulate your nervous system - perhaps try breathing in for 4 counts, hold for 7, and exhale for 8 counts. Would you like to explore what might be triggering these feelings?",
    "Anxiety can be really challenging. Many find mindfulness practices helpful. Have you discovered any techniques that have worked for you in the past?",
    "When anxiety arises, grounding exercises can help bring you back to the present moment. Perhaps try noticing 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. Would you like to talk more about what's causing these feelings?",
    "I hear that you're feeling anxious. Remember that these feelings, while difficult, are temporary and will pass. Would it help to explore what might be contributing to this anxiety?"
  ],
  
  depression: [
    "I'm sorry you're feeling low. Depression can make even small tasks feel overwhelming. Sometimes taking one tiny step, like getting out of bed or taking a short walk, can be a meaningful victory. What's one small thing that might bring you a moment of peace today?",
    "When we're experiencing depression, everything can feel overwhelming. Could we identify one small, manageable action that might help you feel a sense of accomplishment today?",
    "It takes courage to acknowledge these feelings. Have you been able to speak with a mental health professional about what you're experiencing? Professional support can be very valuable during these times.",
    "Depression can feel very isolating. Sometimes connecting with others, even briefly, can provide some relief. Is there someone supportive you might reach out to, even with just a short message?"
  ],
  
  stress: [
    "It sounds like you're under significant stress. Taking even 5 minutes for yourself to do something calming can help reset your nervous system. What small self-care activity might you be able to incorporate today?",
    "When we're stressed, our bodies physically respond with tension. Progressive muscle relaxation can help - perhaps try tensing and then relaxing each muscle group, starting from your toes and working up. Would you like to explore what's contributing to your stress?",
    "Journaling can be a helpful way to process stressful feelings. Writing down what's on your mind might help externalize some of those thoughts. Would that be something you'd be willing to try?",
    "It sounds like you have a lot on your plate right now. Sometimes reviewing our commitments and identifying what can be delegated, postponed, or eliminated can help create some breathing room. Would it help to talk through your current responsibilities?"
  ],
  
  sleep: [
    "Sleep difficulties can be really frustrating. Establishing a consistent bedtime routine can help signal to your body that it's time to wind down. What might a calming pre-sleep routine look like for you?",
    "Blue light from screens can interfere with your body's natural sleep signals. If possible, try avoiding phones and computers for an hour before bed. Have you found any particular activities helpful for winding down?",
    "Many people find that calming sounds or guided sleep meditations help with falling asleep. Would you be open to exploring some sleep-focused audio resources?",
    "Racing thoughts at bedtime can make sleep elusive. Keeping a notepad by your bed to jot down thoughts can sometimes help clear your mind. Would you like to discuss other strategies for managing nighttime rumination?"
  ],
  
  gratitude: [
    "Practicing gratitude can be a powerful tool for shifting perspective. Even in difficult times, can you identify one thing, however small, that you're grateful for today?",
    "Noticing positive moments, however small, can gradually shift our outlook over time. That's a wonderful practice to cultivate.",
    "Research shows that regularly acknowledging things we're grateful for can positively impact our mental health. Thank you for sharing that reflection.",
    "Gratitude practice is like a muscle that gets stronger with use. I appreciate you bringing that positive awareness to our conversation."
  ],
  
  general: [
    "I'm here to listen and support you. Would you feel comfortable sharing more about what you're experiencing?",
    "Thank you for sharing that with me. How have you been managing these feelings?",
    "I appreciate your openness. What do you think might help you feel more supported right now?",
    "That sounds challenging. Have you found any strategies helpful in similar situations before?",
    "I'm listening. Sometimes just expressing our thoughts can help us process them more effectively.",
    "Your feelings are valid. Would it help to explore this topic a bit further?",
    "I'm here to support you. What would be most helpful for you in this moment?",
    "It takes courage to discuss these things. Is there a specific aspect you'd like to focus on?"
  ]
};

// Simple keyword matching for response selection
const keywords = {
  anxiety: ["anxious", "anxiety", "nervous", "worry", "panic", "stressed", "tension", "uneasy", "fear", "dread", "apprehension"],
  depression: ["depressed", "depression", "sad", "down", "hopeless", "empty", "blue", "unhappy", "miserable", "worthless", "numb", "lonely"],
  stress: ["stress", "stressed", "pressure", "overwhelmed", "burnout", "burden", "strain", "overload", "exhausted", "tense"],
  sleep: ["sleep", "insomnia", "tired", "exhausted", "restless", "fatigue", "bed", "wake", "nightmare", "dreams", "rest"],
  gratitude: ["grateful", "gratitude", "thankful", "appreciate", "blessed", "fortunate", "appreciation", "thanks"]
};

// Add specific keywords for mental health crises - ONLY for suicidal content
const crisisKeywords = {
  suicidal: ["suicidal", "suicide", "kill myself", "end my life", "don't want to live", "want to die"]
};

// Add specific crisis responses
const crisisResponses = {
  suicidal: [
    "I'm really concerned about what you're sharing. If you're having thoughts of harming yourself, please reach out to a crisis helpline immediately. In the US, you can call or text 988 for the Suicide and Crisis Lifeline, available 24/7. Would you like me to provide more resources?",
    "I'm taking what you're saying very seriously. Please connect with a mental health professional right away. The National Suicide Prevention Lifeline (988) has trained counselors available 24/7 who care and want to help. Your life matters.",
    "I'm concerned about you and what you're going through. If you're in crisis, please call your local emergency number (such as 911 in the US) or go to your nearest emergency room. Would it help to talk about what's making you feel this way?"
  ]
};

// Function to determine if a message is a greeting
function isGreeting(message: string): boolean {
  const greetingPatterns = [
    /^hi\b/i, /^hello\b/i, /^hey\b/i, /^good morning\b/i, /^good afternoon\b/i, 
    /^good evening\b/i, /^what's up\b/i, /^howdy\b/i, /^greetings\b/i
  ];
  return greetingPatterns.some(pattern => pattern.test(message));
}

// Function to get category based on keywords
function getCategory(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (isGreeting(lowerMessage)) {
    return "greeting";
  }
  
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerMessage.includes(word))) {
      return category;
    }
  }
  
  return "general";
}

// Function to get a random response from a category
function getRandomResponse(category: string): string {
  const categoryResponses = responses[category as keyof typeof responses] || responses.general;
  const randomIndex = Math.floor(Math.random() * categoryResponses.length);
  return categoryResponses[randomIndex];
}

// Function to format messages for the Gemma API
function formatMessagesForGemma(messages: ChatMessage[], systemPrompt: string): any {
  // Start with the system prompt
  let prompt = systemPrompt + "\n\n";
  
  // Add conversation history
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      prompt += `Human: ${msg.content}\n`;
    } else if (msg.role === "assistant") {
      prompt += `Assistant: ${msg.content}\n`;
    }
  }
  
  // Add a final turn for the assistant to respond
  prompt += "Assistant:";
  
  // Create the API request format
  return {
    inputs: prompt.trim(),
    parameters: {
      max_new_tokens: 300,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true,
      return_full_text: false
    }
  };
}

// Function to generate Gemma response
export async function generateGemmaResponse(
  messages: ChatMessage[],
  currentMessage: string
): Promise<string> {
  try {
    // First check only for suicide-related crisis keywords
    const lowerMessage = currentMessage.toLowerCase();
    
    // Check for crisis keywords first and provide immediate responses
    if (crisisKeywords.suicidal.some(word => lowerMessage.includes(word))) {
      const randomIndex = Math.floor(Math.random() * crisisResponses.suicidal.length);
      return crisisResponses.suicidal[randomIndex];
    }
    
    // For all other messages, including feeling sad, use the API
    const allMessages = [
      ...messages,
      { role: "user" as const, content: currentMessage }
    ];

    // Format messages for the API
    const payload = formatMessagesForGemma(allMessages, THERAPEUTIC_PROMPT);

    console.log("Sending to Gemma API:", payload);

    // Check if API key is available
    if (!API_KEY) {
      console.warn("No API key available, falling back to local response generation");
      const category = getCategory(currentMessage);
      return getRandomResponse(category);
    }

    // Test the serverless function infrastructure with a simple call first
    try {
      console.log("Testing serverless functions with:", TEST_URL);
      const testResponse = await fetch(TEST_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!testResponse.ok) {
        // If the test fails, log the error and fall back to local responses
        const errorText = await testResponse.text();
        console.error("Test function error:", testResponse.status, errorText);
        throw new Error(`Test function returned ${testResponse.status}`);
      } else {
        console.log("Test function successful, proceeding with Gemma API call");
      }
    } catch (testError) {
      console.error("Error testing serverless function:", testError);
      const category = getCategory(currentMessage);
      return getRandomResponse(category);
    }

    // Call the Netlify serverless function with improved error handling
    try {
      console.log("Sending request to:", API_URL);
      console.log("API key status:", API_KEY ? "Set" : "Not set");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle API errors
      if (!response.ok) {
        console.error(`API Error: ${response.status} - ${response.statusText}`);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        
        const category = getCategory(currentMessage);
        return getRandomResponse(category);
      }
      
      const data = await response.json();
      
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.warn("Empty API response, falling back to local response");
        const category = getCategory(currentMessage);
        return getRandomResponse(category);
      }
      
      let responseString = "";
      
      if (typeof data === 'string') {
        responseString = data;
      } else if (data && typeof data.generated_text === 'string') {
        responseString = data.generated_text;
      } else if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (typeof firstItem === 'string') {
          responseString = firstItem;
        } else if (firstItem && typeof firstItem.generated_text === 'string') {
          responseString = firstItem.generated_text;
        }
      }
      
      if (!responseString) {
        console.warn("Could not extract response text, falling back to local response");
        const category = getCategory(currentMessage);
        return getRandomResponse(category);
      }
      
      return cleanResponse(responseString);
      
    } catch (error) {
      console.error("Error in API call:", error);
      const category = getCategory(currentMessage);
      return getRandomResponse(category);
    }
  } catch (error) {
    console.error("Error in generateGemmaResponse:", error);
    const category = getCategory(currentMessage);
    return getRandomResponse(category);
  }
}

// Helper function to clean the response text
function cleanResponse(text: string): string {
  // Remove the instruction pattern that's showing up
  text = text.replace(/^Respond with helpful, empathetic advice\.?\s*/i, "").trim();
  
  // Remove any "You are a professional" instructions
  text = text.replace(/^You are a professional therapeutic AI assistant\.?\s*/i, "").trim();
  
  // Remove any "Assistant:" prefix if present
  text = text.replace(/^Assistant:\s*/i, "").trim();
  
  // Remove any system instructions or prompts that might be in the response
  text = text.replace(/you are (?:a|an) (?:professional|experienced|empathetic|therapeutic).*?(?:\.|$)/i, "").trim();
  
  // Remove any system prompt portions that might leak
  text = text.replace(/your approach is:[\s\S]*?professional presence\./i, "").trim();
  
  // Remove any lines that look like instructions
  text = text.replace(/in your responses:[\s\S]*?compassionate presence\./i, "").trim();
  
  // Remove any User: or similar patterns that might follow
  text = text.split(/\n(?:User|Human):.*$/)[0].trim();
  
  // If we've stripped everything, provide a fallback response
  if (!text) {
    return "I'm here to help with your wellness journey. How can I assist you today?";
  }
  
  return text;
}

export const gemma = {
  generateGemmaResponse,
}; 