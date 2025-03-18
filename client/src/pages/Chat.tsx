import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bot, 
  Send, 
  Brain, 
  Sparkles, 
  Activity, 
  Heart, 
  Stethoscope,
  AlertCircle,
  Loader2,
  MessageSquare,
  PlusCircle,
  Wand2,
  Zap,
  Lightbulb,
  Syringe,
  Pill,
  Waves,
  User,
  X
} from "lucide-react";
import { saveChatMessage, getMessages, deleteMessages } from "@/lib/firebase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { generateGemmaResponse } from "@/lib/gemma";
import { Message, ChatTab } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { v4 as uuidv4 } from "uuid";
import { gemma } from "@/lib/gemma";

// Welcome messages for new chats
const welcomeMessages = [
  "Hello! I'm your AI health companion. I'm here to listen and support you. How are you feeling today?",
  "Welcome to LifeSync Chat! I'm here to help with your wellness journey. How can I assist you today?",
  "Hi there! I'm your personal wellness assistant. How are you doing today?",
  "Welcome! I'm here to provide support and guidance for your well-being. How are you feeling right now?"
];

// Get a random welcome message
const getRandomWelcomeMessage = () => {
  const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
  return welcomeMessages[randomIndex];
};

// Enhanced knowledge base with more detailed medical information
const healthKnowledgeBase = {
  anxiety: {
    symptoms: ["restlessness", "rapid heartbeat", "excessive worry", "difficulty concentrating", "sleep disturbances", "muscle tension"],
    recommendations: [
      "Practice deep breathing exercises - 4-7-8 technique",
      "Progressive muscle relaxation - 15 minutes daily",
      "Regular physical activity - 30 minutes of moderate exercise",
      "Mindfulness meditation - guided sessions",
      "Cognitive Behavioral Therapy techniques",
      "Stress management through time-boxing"
    ],
    severity: {
      mild: "Self-management techniques and lifestyle changes. Monitor symptoms for 2 weeks.",
      moderate: "Consider counseling or therapy. Combination of self-help and professional support recommended.",
      severe: "Urgent consultation with a mental health professional. May require comprehensive treatment plan."
    },
    who_guidelines: "WHO recommends a stepped care approach, starting with self-help and lifestyle changes before moving to professional interventions. Regular monitoring and adjustment of interventions based on response.",
    specialists: ["Psychiatrist", "Clinical Psychologist", "Cognitive Behavioral Therapist"],
    treatment_approaches: ["Cognitive Behavioral Therapy", "Exposure Therapy", "Mindfulness-Based Stress Reduction", "Medication (if prescribed by healthcare provider)"]
  },
  depression: {
    symptoms: ["persistent sadness", "loss of interest", "sleep changes", "fatigue", "concentration difficulties", "appetite changes", "feelings of worthlessness"],
    recommendations: [
      "Maintain regular sleep schedule - 7-9 hours daily",
      "Exercise regularly - start with 10-minute walks",
      "Stay connected with support system",
      "Structure daily activities and set small goals",
      "Practice gratitude journaling",
      "Engage in enjoyable activities daily"
    ],
    severity: {
      mild: "Self-help strategies and lifestyle modifications. Monitor mood daily.",
      moderate: "Psychological interventions recommended. Consider combination therapy.",
      severe: "Immediate professional intervention required. Combined therapy and medication evaluation."
    },
    who_guidelines: "WHO emphasizes early intervention and combining psychological support with social support systems. Regular assessment of suicide risk and safety planning when necessary.",
    specialists: ["Psychiatrist", "Clinical Psychologist", "Licensed Therapist"],
    treatment_approaches: ["Psychotherapy", "Cognitive Behavioral Therapy", "Interpersonal Therapy", "Medication Management"]
  },
  stress: {
    symptoms: ["tension", "irritability", "difficulty sleeping", "concentration problems", "physical symptoms", "emotional exhaustion"],
    recommendations: [
      "Time management techniques - Priority matrix",
      "Regular exercise - 150 minutes per week",
      "Stress-reduction activities - Progressive relaxation",
      "Healthy work-life balance strategies",
      "Social support engagement",
      "Nature exposure - 20 minutes daily"
    ],
    severity: {
      mild: "Lifestyle modifications and self-help techniques. Review stressors weekly.",
      moderate: "Consider stress management programs and counseling support.",
      severe: "Professional intervention recommended. Comprehensive stress management plan needed."
    },
    who_guidelines: "WHO recommends addressing both individual and environmental factors contributing to stress. Focus on sustainable lifestyle changes and building resilience.",
    specialists: ["Stress Management Counselor", "Occupational Therapist", "Clinical Psychologist"],
    treatment_approaches: ["Stress Management Training", "Lifestyle Modification", "Relaxation Techniques", "Cognitive Restructuring"]
  }
};

export default function Chat() {
  // State for tabs
  const [tabs, setTabs] = useState<ChatTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  
  // Other state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user, loading, signInWithGoogle } = useAuth();
  const [isMessageLoading, setIsMessageLoading] = useState(false);

  // Close a tab
  const closeTab = async (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Don't close if it's the only tab
    if (tabs.length <= 1) return;
    
    // Get the tab to be closed
    const tabToClose = tabs.find(tab => tab.id === tabId);
    
    // Delete messages from Firebase if user is logged in
    if (user && tabToClose) {
      try {
        // Get message IDs from the tab
        const messageIds = tabToClose.messages.map(msg => msg.id);
        
        // Delete messages from Firebase
        await Promise.all(messageIds.map(id => deleteMessages(user.uid, id)));
      } catch (error) {
        console.error("Error deleting messages:", error);
      }
    }
    
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    // If closing the active tab, switch to another tab
    if (tabId === activeTabId) {
      setActiveTabId(newTabs[0].id);
      setMessages(newTabs[0].messages);
    }
    
    // Save the updated tabs list to localStorage
    localStorage.setItem(`chat_tabs_${user?.uid}`, JSON.stringify(newTabs));
  };

  // Switch to a tab
  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setMessages(tab.messages);
    }
  };

  // Load messages from Firebase and restore tabs
  useEffect(() => {
    const loadMessages = async () => {
      if (user) {
        try {
          // Try to load tabs from localStorage first
          const savedTabsJSON = localStorage.getItem(`chat_tabs_${user.uid}`);
          let savedTabs: ChatTab[] = [];
          
          if (savedTabsJSON) {
            try {
              savedTabs = JSON.parse(savedTabsJSON);
              // Convert string dates back to Date objects
              savedTabs = savedTabs.map(tab => ({
                ...tab,
                createdAt: new Date(tab.createdAt),
                lastUpdated: new Date(tab.lastUpdated),
                messages: tab.messages.map(msg => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                }))
              }));
            } catch (e) {
              console.error("Error parsing saved tabs:", e);
              savedTabs = [];
            }
          }
          
          if (savedTabs.length > 0) {
            // Use saved tabs
            setTabs(savedTabs);
            setActiveTabId(savedTabs[0].id);
            setMessages(savedTabs[0].messages);
          } else {
            // Fallback to loading messages from Firebase
            const savedMessages = await getMessages(user.uid);
            if (savedMessages.length > 0) {
              // Create a tab with saved messages
              const savedTab: ChatTab = {
                id: Date.now().toString(),
                name: "Previous Chat",
                messages: savedMessages,
                createdAt: new Date(savedMessages[0].timestamp),
                lastUpdated: new Date(savedMessages[savedMessages.length - 1].timestamp)
              };
              setTabs([savedTab]);
              setActiveTabId(savedTab.id);
              setMessages(savedMessages);
              
              // Save to localStorage
              localStorage.setItem(`chat_tabs_${user.uid}`, JSON.stringify([savedTab]));
            } else {
              // Create a new tab with welcome message
              createNewTab();
            }
          }
        } catch (error) {
          console.error("Error loading messages:", error);
          createNewTab();
        }
      }
    };
    
    if (user && tabs.length === 0) {
      loadMessages();
    }
  }, [user]);

  // Improved auto-scroll function with more robust implementation
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      // Try different methods to find the scrollable element
      const scrollableElement = 
        // First try using data attribute
        scrollElement.querySelector('[data-radix-scroll-area-viewport]') || 
        // Then try using class names that might be used by the ScrollArea component
        scrollElement.querySelector('.scroll-area-viewport') ||
        // Then try the first div child which is likely the viewport
        scrollElement.querySelector('div > div') ||
        // Fallback to the ref itself
        scrollElement;
      
      if (scrollableElement) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          scrollableElement.scrollTop = scrollableElement.scrollHeight;
        });
      }
    }
  };

  // Make sure we scroll when messages change and when isTyping changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isTyping) {
      scrollToBottom();
    }
  }, [isTyping]);

  // Also scroll to bottom when a new tab is selected
  useEffect(() => {
    scrollToBottom();
  }, [activeTabId]);

  // Create a new tab
  const createNewTab = () => {
    const newTabId = Date.now().toString();
    
    // Only include welcome message for truly new tabs
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: getRandomWelcomeMessage(),
      sender: 'bot',
      timestamp: new Date()
    };
    
    const newTab: ChatTab = {
      id: newTabId,
      name: `Chat ${tabs.length + 1}`,
      messages: [welcomeMessage],
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    const updatedTabs = [...tabs, newTab];
    setTabs(updatedTabs);
    setActiveTabId(newTabId);
    setMessages([welcomeMessage]); // Set just this tab's messages
    
    // Save welcome message if user is logged in
    if (user) {
      saveChatMessage(user.uid, welcomeMessage);
      
      // Save updated tabs to localStorage
      localStorage.setItem(`chat_tabs_${user.uid}`, JSON.stringify(updatedTabs));
    }
  };

  // Update localStorage when tabs change
  useEffect(() => {
    if (user && tabs.length > 0) {
      localStorage.setItem(`chat_tabs_${user.uid}`, JSON.stringify(tabs));
    }
  }, [tabs, user]);

  const handleSendMessage = async () => {
    try {
      if (!input.trim()) return;
      
      // Set loading state
      setIsMessageLoading(true);
      
      // Create user message
      const userMsg: Message = {
        id: uuidv4(),
        content: input,
        role: "user",
        timestamp: new Date().toISOString(),
      };
      
      // Add user message to state
      setMessages(prev => [...prev, userMsg]);
      
      // Clear input after sending
      setInput("");
      
      // Try to generate a response via Gemma API
      try {
        const response = await gemma.generateGemmaResponse(
          messages.map(msg => ({ 
            role: msg.role, 
            content: msg.content 
          })),
          userMsg.content
        );
        
        // Create assistant message with API response
        const botMsg: Message = {
          id: uuidv4(),
          content: response,
          role: "assistant", 
          timestamp: new Date().toISOString(),
        };
        
        // Add assistant message to state
        setMessages(prev => [...prev, botMsg]);
      } catch (error) {
        console.error("Error getting response from AI:", error);
        
        // Create error message
        const errorMsg: Message = {
          id: uuidv4(),
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
          role: "assistant",
          timestamp: new Date().toISOString(),
        };
        
        // Add error message to state
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        // Reset loading state
        setIsMessageLoading(false);
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      setIsMessageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Card className="p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">Welcome to LifeSync Chat</h2>
          <p className="text-center mb-6">Please sign in to start chatting with your AI health companion</p>
          <Button onClick={signInWithGoogle} className="w-full">
            <img src="/google.svg" alt="Google" className="w-5 h-5 mr-2" />
            Sign in with Google
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      <div className="px-4 py-2 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-7 w-7 mr-2">
              <AvatarImage src="/ai-avatar.png" />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-600 text-white">
                <Bot className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-sm font-semibold">LifeSync Chat</h1>
              <p className="text-xs text-muted-foreground">Your wellness companion</p>
            </div>
          </div>
          <Button 
            onClick={createNewTab} 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-1 text-xs h-8"
          >
            <PlusCircle className="h-3 w-3" />
            <span>New Chat</span>
          </Button>
        </div>
      </div>
      
      {tabs.length > 0 && (
        <div className="border-b bg-white/50 dark:bg-slate-900/50 py-1">
          <div className="max-w-3xl mx-auto">
            <Tabs value={activeTabId} onValueChange={switchTab} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto h-8">
                {tabs.map(tab => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="flex items-center gap-1 relative pr-6 h-6 text-xs"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    <span className="truncate max-w-[80px]">{tab.name}</span>
                    <div 
                      onClick={(e) => closeTab(tab.id, e)}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
                      role="button"
                      aria-label="Close tab"
                    >
                      <X className="h-2.5 w-2.5" />
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full p-2">
          <div className="space-y-2 max-w-3xl mx-auto">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                } items-end space-x-2`}
              >
                {message.sender === "bot" && (
                  <div className="flex-shrink-0">
                    <Avatar className="h-5 w-5 border-2 border-white shadow-sm">
                      <AvatarImage src="/ai-avatar.png" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-600 text-white">
                        <Bot className="h-2 w-2" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`max-w-[75%] rounded-xl p-2 shadow-sm ${
                    message.sender === "user"
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white dark:from-blue-600 dark:to-indigo-700"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="prose dark:prose-invert prose-sm max-w-none text-xs">
                    {message.text}
                  </div>
                  <div className="mt-1 text-xs opacity-70 text-right">
                    {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </motion.div>
                {message.sender === "user" && (
                  <div className="flex-shrink-0">
                    <Avatar className="h-5 w-5 border-2 border-white shadow-sm">
                      <AvatarImage src={user.photoURL || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-600 text-white">
                        <User className="h-2 w-2" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </motion.div>
            ))}
            {isMessageLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start items-end space-x-2"
              >
                <div className="flex-shrink-0">
                  <Avatar className="h-5 w-5 border-2 border-white shadow-sm">
                    <AvatarImage src="/ai-avatar.png" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-600 text-white">
                      <Bot className="h-2 w-2" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm max-w-[75%] border border-slate-200 dark:border-slate-700">
                  <div className="flex space-x-1">
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-1 h-1 bg-blue-500 rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      className="w-1 h-1 bg-blue-500 rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                      className="w-1 h-1 bg-blue-500 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      <div className="p-2 border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm text-xs h-8"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isMessageLoading}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-sm rounded-md p-1.5 flex items-center justify-center h-8 w-8"
            aria-label="Send message"
          >
            {isMessageLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </form>
        <div className="border-t pt-2 text-center text-xs text-muted-foreground mt-4">
          <p>Your messages are saved securely. This chat is powered by Google's Gemma 2B-Instruct, a professional therapeutic AI assistant.</p>
        </div>
      </div>
    </div>
  );
}

