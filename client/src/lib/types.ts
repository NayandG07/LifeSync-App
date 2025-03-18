// Define the ChatMessage type for OpenChat
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Define the Message type for the Chat component
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

// Define the ChatTab type for the Chat component
export interface ChatTab {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  lastUpdated: Date;
} 