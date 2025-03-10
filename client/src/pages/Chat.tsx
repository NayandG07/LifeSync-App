import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  User
} from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI health companion. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I understand your concern. Based on the symptoms you've described, I recommend getting adequate rest and staying hydrated. However, please consult with a healthcare professional for a proper medical evaluation.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Header with lighter colors */}
    <motion.div 
        initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 p-6 rounded-2xl mb-6 relative overflow-hidden border border-blue-200 dark:border-blue-800"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 dark:bg-white/10 rounded-xl backdrop-blur-sm">
              <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
              <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-1 flex items-center gap-2">
                AI Health Assistant
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
              </h1>
              <p className="text-blue-700 dark:text-blue-300">Your personal health companion powered by AI</p>
                </div>
              </div>

          {/* AI Features Display */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
              <Brain className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Smart Analysis</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Medical Knowledge</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white/50 dark:bg-gray-800/50 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/50"
            onClick={() => setInput("What's my health score today?")}
          >
            <Activity className="w-4 h-4 mr-2" />
            Check Health Score
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white/50 dark:bg-gray-800/50 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/50"
            onClick={() => setInput("What are some stress management techniques?")}
          >
            <Brain className="w-4 h-4 mr-2" />
            Stress Management
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white/50 dark:bg-gray-800/50 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/50"
            onClick={() => setInput("Give me some exercise recommendations")}
          >
            <Activity className="w-4 h-4 mr-2" />
            Exercise Tips
          </Button>
        </div>
      </motion.div>

      {/* Enhanced Chat Container */}
      <div className="flex-1 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg mb-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10"></div>
        
        {/* AI Assistant Status */}
        <div className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-medium text-green-700 dark:text-green-300">AI Assistant Active</span>
        </div>
        
        <div className="relative h-[calc(65vh-100px)] overflow-y-auto pr-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex items-start gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.sender === 'user' 
                    ? 'bg-blue-100 dark:bg-blue-900' 
                    : 'bg-purple-100 dark:bg-purple-900'
                }`}>
                  {message.sender === 'user' 
                    ? <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    : <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  }
                    </div>
                
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-auto'
                    : 'bg-white dark:bg-gray-800 dark:text-gray-100 shadow-md'
                }`}>
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />
                    </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md flex items-center gap-3">
                      <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">AI is analyzing your message...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </AnimatePresence>
        </div>
        </div>

      {/* Enhanced Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg flex gap-4 items-center border border-blue-100 dark:border-blue-900"
      >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message or health question..."
          className="flex-1 bg-gray-50 dark:bg-gray-900 border-blue-100 dark:border-blue-900"
        />
            <Button 
          onClick={handleSend}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 rounded-xl"
            >
          <Send className="w-5 h-5" />
            </Button>
      </motion.div>
    </div>
  );
}
