import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HealthMetrics from "@/components/dashboard/HealthMetrics";
import MoodTracker from "@/components/dashboard/MoodTracker";
import { MessageSquareText, Stethoscope, Sun, Moon, Cloud, LogIn, UserPlus, Bot, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { auth } from '@/lib/firebase';

export default function Home() {
  const [firstName, setFirstName] = useState<string>("");
  const navigate = useNavigate();
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setTimeOfDay("morning");
    else if (hour >= 12 && hour < 17) setTimeOfDay("afternoon");
    else if (hour >= 17 && hour < 21) setTimeOfDay("evening");
    else setTimeOfDay("night");

    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
      const { name } = JSON.parse(userProfile);
      const firstWord = name.split(' ')[0];
      setFirstName(firstWord);
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  const getTimeIcon = () => {
    switch (timeOfDay) {
      case "morning": return <Sun className="h-8 w-8 text-amber-500 animate-spin-slow" />;
      case "afternoon": return <Sun className="h-8 w-8 text-orange-500 animate-spin-slow" />;
      case "evening": return <Cloud className="h-8 w-8 text-indigo-500 animate-pulse" />;
      case "night": return <Moon className="h-8 w-8 text-blue-500 animate-pulse" />;
    }
  };

  const getGreeting = () => {
    switch (timeOfDay) {
      case "morning": return "Good Morning";
      case "afternoon": return "Good Afternoon";
      case "evening": return "Good Evening";
      case "night": return "Good Night";
    }
  };

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to LifeSync
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Your personal health and wellness companion
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4"
        >
          <Button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-medium"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign In
          </Button>
          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="px-8 py-6 text-lg font-medium border-2"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Sign Up
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10 -z-10 animate-gradient-shift"></div>

      {/* Welcome Section */}
      <AnimatePresence mode="wait">
        {mounted && (
          <motion.div 
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4">
              {getTimeIcon()}
              <motion.h1 
                className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {getGreeting()}{firstName ? `, ${firstName}` : ''}
              </motion.h1>
            </div>
            <motion.p 
              className="text-muted-foreground text-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Track your mood and monitor your health metrics
            </motion.p>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/20 to-pink-200/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-cyan-200/20 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl -z-10"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div 
        className="grid gap-8 lg:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <HealthMetrics />
        <MoodTracker />
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden"
        >
          <Button 
            className="w-full h-24 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 shadow-lg group"
            onClick={() => navigate('/chat')}
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer"></div>
            <div className="flex items-center justify-center gap-3">
              <Bot className="w-8 h-8 transition-transform group-hover:scale-110 group-hover:rotate-6" />
              <div className="text-left">
                <div className="text-lg font-semibold">Chat with AI Assistant</div>
                <div className="text-sm opacity-90">Get personalized health insights</div>
              </div>
            </div>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden"
        >
          <Button 
            className="w-full h-24 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 shadow-lg group"
            onClick={() => navigate('/symptoms')}
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer"></div>
            <div className="flex items-center justify-center gap-3">
              <Activity className="w-8 h-8 transition-transform group-hover:scale-110 group-hover:rotate-6" />
              <div className="text-left">
                <div className="text-lg font-semibold">Check Symptoms</div>
                <div className="text-sm opacity-90">Analyze your health conditions</div>
              </div>
            </div>
          </Button>
        </motion.div>
      </div>
    </div>
  );
} 