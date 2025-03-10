import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Brain, Activity, Heart, Zap, Sparkles, Bot, Thermometer, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { toast } from "sonner";

interface HealthInsight {
  metric: string;
  value: string;
  trend: "up" | "down" | "neutral";
  analysis: string;
  recommendation: string;
  progress?: number; // Progress value between 0-100 for the bar
}

export default function HealthMetrics() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    // Load user profile from localStorage
    const profileData = localStorage.getItem('userProfile');
    if (profileData) {
      setUserProfile(JSON.parse(profileData));
    } else if (auth.currentUser && !localStorage.getItem('profileNotificationShown')) {
      // Only show notification once and mark it as shown
      localStorage.setItem('profileNotificationShown', 'true');
      toast.info(
        "Please update your profile for accurate health metrics",
        {
          duration: 5000,
          action: {
            label: "Update Profile",
            onClick: () => document.getElementById("profile-trigger")?.click()
          }
        }
      );
    }

    const loadData = async () => {
      setLoading(true);
      
      // Get user metrics from Firestore if available
      let userMetrics: any = {};
      
      if (auth.currentUser) {
        try {
          const userId = auth.currentUser.uid;
          const metricsRef = collection(db, 'healthMetrics');
          const q = query(
            metricsRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            userMetrics = querySnapshot.docs[0].data();
          }
        } catch (error) {
          console.error("Error fetching health metrics:", error);
        }
      }
      
      // Get data from localStorage as fallback
      const steps = userMetrics.steps || localStorage.getItem('steps') || 0;
      const heartRate = userMetrics.heartRate || localStorage.getItem('heartRate') || 72;
      const caloriesBurned = userMetrics.caloriesBurned || localStorage.getItem('caloriesBurned') || 0;
      const sleepHours = userMetrics.sleepHours || localStorage.getItem('sleepHours') || 7.5;
      const bodyTemp = userMetrics.bodyTemp || localStorage.getItem('bodyTemp') || 98.6;
      
      // Calculate progress values
      const heartRateProgress = Math.min(100, Math.max(0, (Number(heartRate) - 40) / (100 - 40) * 100));
      const sleepProgress = Math.min(100, Math.max(0, Number(sleepHours) / 9 * 100));
      const stepsProgress = Math.min(100, Math.max(0, Number(steps) / 10000 * 100));
      const caloriesProgress = Math.min(100, Math.max(0, Number(caloriesBurned) / 3000 * 100));
      const tempProgress = Math.min(100, Math.max(0, (Number(bodyTemp) - 97) / (99 - 97) * 100));
      
      setInsights([
        {
          metric: "Heart Rate",
          value: `${heartRate} BPM`,
          trend: Number(heartRate) > 80 ? "up" : Number(heartRate) < 60 ? "down" : "neutral",
          analysis: "Your heart rate shows a healthy pattern with optimal recovery periods.",
          recommendation: "Consider incorporating more low-intensity activities for better heart rate variability.",
          progress: heartRateProgress
        },
        {
          metric: "Sleep Quality",
          value: `${sleepHours} hrs`,
          trend: Number(sleepHours) > 8 ? "up" : Number(sleepHours) < 7 ? "down" : "neutral",
          analysis: "Your sleep duration is within the recommended range, but quality could be improved.",
          recommendation: "Try maintaining a consistent sleep schedule and reducing screen time before bed.",
          progress: sleepProgress
        },
        {
          metric: "Steps",
          value: `${Number(steps).toLocaleString()} steps`,
          trend: Number(steps) > 8000 ? "up" : Number(steps) < 5000 ? "down" : "neutral",
          analysis: "You've maintained an active lifestyle this week with consistent exercise.",
          recommendation: "Great progress! Mix in some strength training to complement your cardio routine.",
          progress: stepsProgress
        },
        {
          metric: "Body Temperature",
          value: `${bodyTemp}°F`,
          trend: "neutral",
          analysis: "Your body temperature is within the normal range according to WHO guidelines (97°F - 99°F). Regular monitoring helps detect potential health issues early.",
          recommendation: "WHO recommends monitoring temperature during illness or intense physical activity. Stay hydrated and maintain a balanced diet for optimal temperature regulation.",
          progress: tempProgress
        },
        {
          metric: "Calories Burned",
          value: `${Number(caloriesBurned).toLocaleString()} kcal`,
          trend: Number(caloriesBurned) > 2000 ? "up" : Number(caloriesBurned) < 1500 ? "down" : "neutral",
          analysis: "You're consistently meeting your daily caloric expenditure goals through a mix of activities.",
          recommendation: "Consider adding strength training to boost your basal metabolic rate.",
          progress: caloriesProgress
        },
        {
          metric: "Blood Glucose",
          value: "98 mg/dL",
          trend: "neutral",
          analysis: "Your blood glucose levels are within the normal range (70-140 mg/dL). Maintaining stable blood sugar is crucial for overall health.",
          recommendation: "Continue monitoring your levels and maintain a balanced diet with regular meal times.",
          progress: 70  // 70% of normal range
        }
      ]);
      
      setLoading(false);
    };

    loadData();
  }, []);

  const handleMetricClick = (metric: string) => {
    setSelectedMetric(metric);
    setShowAIAnalysis(true);
  };

  if (loading) {
    return (
      <Card className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse">
              <div className="h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(255,255,255,0.08)] border-[1px] border-gray-200/50 dark:border-gray-800/50 hover:shadow-[0_16px_48px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_16px_48px_rgba(255,255,255,0.1)] transition-all duration-300 transform hover:translate-y-[-2px]">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-emerald-50/50 dark:from-blue-900/20 dark:via-purple-900/10 dark:to-emerald-900/20 pointer-events-none"></div>
      
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight">Health Metrics</CardTitle>
        <CardDescription>Track your daily health metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden backdrop-blur-sm border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-xl">
      {/* Glassmorphism and gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/30 via-blue-100/30 to-purple-100/30 dark:from-emerald-900/30 dark:via-blue-900/30 dark:to-purple-900/30 opacity-50" />

      <div className="relative p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Health Overview
            <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 dark:bg-blue-900/50 border border-blue-200/50 dark:border-blue-800/50">
            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI Powered</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.metric}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => handleMetricClick(insight.metric)}
              className={cn(
                "group cursor-pointer rounded-xl p-4 relative overflow-hidden",
                "bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm",
                "border border-gray-200/50 dark:border-gray-700/50",
                "hover:shadow-lg hover:border-blue-500/20 dark:hover:border-blue-400/20",
                    "hover:bg-white/80 dark:hover:bg-gray-800/80",
                    "transition-all duration-500",
                    "transform-gpu hover:scale-[1.02]"
                  )}
                >
                  {/* Enhanced 3D hover effect */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-400/10 dark:to-purple-400/10 opacity-0 group-hover:opacity-100 transition-all duration-700"
                    initial={false}
                    animate={{ 
                      scale: [1, 1.02, 1],
                      opacity: [0, 1, 0.8]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                        <motion.div 
                          className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/50 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/80 shadow-lg"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.3 }}
                        >
                      {insight.metric === "Heart Rate" ? <Heart className="w-5 h-5 text-red-600 dark:text-red-400" /> :
                       insight.metric === "Sleep Quality" ? <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" /> :
                       insight.metric === "Steps" ? <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> :
                       insight.metric === "Body Temperature" ? <Thermometer className="w-5 h-5 text-red-600 dark:text-red-400" /> :
                       insight.metric === "Calories Burned" ? <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" /> :
                       insight.metric === "Blood Glucose" ? <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> :
                       <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                        </motion.div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{insight.metric}</h3>
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    insight.trend === "up" ? "text-emerald-600 dark:text-emerald-400" :
                    insight.trend === "down" ? "text-rose-600 dark:text-rose-400" :
                    "text-blue-600 dark:text-blue-400"
                  )}>
                    {insight.value}
                  </span>
                </div>

                {/* Progress bar that syncs with the actual value */}
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${insight.progress || 0}%` }}
                    transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                    className={cn(
                      "h-full rounded-full",
                      insight.trend === "up" ? "bg-emerald-500 dark:bg-emerald-400" :
                      insight.trend === "down" ? "bg-rose-500 dark:bg-rose-400" :
                      "bg-blue-500 dark:bg-blue-400"
                    )}
                  />
                </div>

                <div className="space-y-2">
                      <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 group-hover:line-clamp-none"
                      >
                    {insight.analysis}
                      </motion.p>
                      
                      {/* Enhanced AI Recommendation preview with delayed animation */}
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        whileHover={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.7, delay: 0.5 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50/50 dark:bg-blue-900/30 rounded-lg backdrop-blur-sm shadow-inner">
                      <Bot className="w-4 h-4 text-blue-500" />
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {insight.recommendation}
                      </p>
                        </div>
                      </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Analysis Modal */}
        <AnimatePresence>
          {showAIAnalysis && selectedMetric && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    AI Analysis: {selectedMetric}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAIAnalysis(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 space-y-6">
                {/* Detailed analysis content here */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Analysis</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      {insights.find(i => i.metric === selectedMetric)?.analysis}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                    <h4 className="font-medium text-emerald-700 dark:text-emerald-300 mb-2">AI Recommendation</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      {insights.find(i => i.metric === selectedMetric)?.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
        </div>
      </CardContent>
    </Card>
  );
}