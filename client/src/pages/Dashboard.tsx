import { motion } from "framer-motion";
import { 
  Droplet, 
  Heart, 
  Activity, 
  Brain, 
  Sparkles, 
  Bot, 
  LineChart, 
  Zap, 
  Lightbulb, 
  Stethoscope, 
  Scale, 
  Ruler, 
  Beaker,
  Clock,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MedicationsModal from '@/components/medications/MedicationsModal';
import WaterIntakeModal from '@/components/water/WaterIntakeModal';
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, Firestore, Timestamp } from "firebase/firestore";
import { Auth } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase";
import { db as firebaseDb } from "@/lib/firebase";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const auth = firebaseAuth as Auth;
const db = firebaseDb as Firestore;

// Add WHO guidelines data
const WHO_GUIDELINES = {
  heartRate: {
    title: "Heart Rate (WHO Guidelines)",
    normal: "60-100 BPM",
    description: "The World Health Organization recommends a normal resting heart rate of 60 to 100 beats per minute for adults.",
    ranges: [
      { label: "Too Low", range: "< 60 BPM", status: "Concern" },
      { label: "Normal", range: "60-100 BPM", status: "Healthy" },
      { label: "Elevated", range: "> 100 BPM", status: "Concern" }
    ]
  },
  bloodPressure: {
    title: "Blood Pressure (WHO Guidelines)",
    normal: "< 120/80 mmHg",
    description: "Blood pressure categories defined by systolic and diastolic measurements.",
    ranges: [
      { label: "Normal", range: "< 120/80 mmHg", status: "Optimal" },
      { label: "Elevated", range: "120-129/< 80 mmHg", status: "Monitor" },
      { label: "Stage 1", range: "130-139/80-89 mmHg", status: "High" },
      { label: "Stage 2", range: "≥ 140/≥ 90 mmHg", status: "Severe" }
    ]
  },
  bmi: {
    title: "BMI (WHO Guidelines)",
    normal: "18.5-24.9",
    description: "Body Mass Index categories for adults.",
    ranges: [
      { label: "Underweight", range: "< 18.5", status: "Below Normal" },
      { label: "Normal", range: "18.5-24.9", status: "Healthy" },
      { label: "Overweight", range: "25-29.9", status: "Above Normal" },
      { label: "Obese", range: "≥ 30", status: "High Risk" }
    ]
  },
  bloodSugar: {
    title: "Blood Sugar (WHO Guidelines)",
    description: "Blood glucose levels for diabetes diagnosis.",
    fasting: {
      normal: "70-100 mg/dL",
      ranges: [
        { label: "Normal", range: "70-100 mg/dL", status: "Healthy" },
        { label: "Prediabetes", range: "100-125 mg/dL", status: "Monitor" },
        { label: "Diabetes", range: "≥ 126 mg/dL", status: "High Risk" }
      ]
    },
    postPrandial: {
      normal: "< 140 mg/dL",
      ranges: [
        { label: "Normal", range: "< 140 mg/dL", status: "Healthy" },
        { label: "Prediabetes", range: "140-199 mg/dL", status: "Monitor" },
        { label: "Diabetes", range: "≥ 200 mg/dL", status: "High Risk" }
      ]
    }
  },
  steps: {
    title: "Daily Steps (WHO Guidelines)",
    normal: "8,000-10,000 steps",
    description: "The World Health Organization recommends daily physical activity through walking for better health.",
    ranges: [
      { label: "Sedentary", range: "< 5,000 steps", status: "Below Target" },
      { label: "Low Active", range: "5,000-7,499 steps", status: "Needs Improvement" },
      { label: "Somewhat Active", range: "7,500-9,999 steps", status: "Good" },
      { label: "Active", range: "≥ 10,000 steps", status: "Excellent" }
    ]
  },
  caloriesBurned: {
    title: "Calories Burned (WHO Guidelines)",
    normal: "2,000-2,500 kcal/day",
    description: "Daily caloric expenditure recommendations based on physical activity level.",
    ranges: [
      { label: "Light Activity", range: "1,500-2,000 kcal", status: "Minimal" },
      { label: "Moderate Activity", range: "2,000-2,500 kcal", status: "Target" },
      { label: "High Activity", range: "2,500-3,000 kcal", status: "Advanced" },
      { label: "Very High Activity", range: "> 3,000 kcal", status: "Athletic" }
    ]
  }
};

interface WaterLog {
  id: string;
  amount: number;
  timestamp: Timestamp;
  userId: string;
}

interface WaterIntake {
  total: number;
  logs: WaterLog[];
}

export default function Dashboard() {
  const [showMedicationsModal, setShowMedicationsModal] = useState(false);
  const [showWaterIntakeModal, setShowWaterIntakeModal] = useState<boolean>(false);
  const [waterIntake, setWaterIntake] = useState<WaterIntake>({ total: 0, logs: [] });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [bmi, setBmi] = useState({ value: 0, status: '' });
  const [steps, setSteps] = useState(8439);
  const [stepsGoal, setStepsGoal] = useState(10000);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [caloriesGoal, setCaloriesGoal] = useState(2000);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.currentUser) {
      loadTodayWaterLogs();
      loadUserProfile();
    }
  }, []);

  // Calculate steps goal based on weight (WHO guidelines)
  const calculateStepsGoal = (weight: number) => {
    // WHO recommends more steps for higher weight individuals
    // Base goal is 10,000 steps, adjusted by weight
    const baseGoal = 10000;
    if (weight > 90) return 12000;      // Higher weight needs more activity
    if (weight > 70) return 11000;      // Moderate adjustment
    return baseGoal;                     // Standard recommendation
  };

  // Calculate calories burned based on steps and weight
  const calculateCaloriesBurned = (steps: number, weight: number) => {
    // Average stride length is 0.762 meters
    const distanceKm = (steps * 0.762) / 1000;
    // MET value for walking is approximately 3.5
    const met = 3.5;
    // Calories burned = MET × Weight (kg) × Time (hours)
    // Assuming average walking speed of 5 km/h
    const timeHours = distanceKm / 5;
    return Math.round(met * weight * timeHours * 3.5);
  };

  // Calculate calories goal based on steps goal and weight
  const calculateCaloriesGoal = (stepsGoal: number, weight: number) => {
    return calculateCaloriesBurned(stepsGoal, weight);
  };

  // Calculate BMI based on weight and height
  const calculateBMI = (weight: number, height: number) => {
    if (!weight || !height) return { value: 0, status: 'Unknown' };
    
    // Height should be in meters for BMI calculation
    const heightInMeters = height;
    const bmiValue = weight / (heightInMeters * heightInMeters);
    
    // Determine BMI status
    let status = '';
    if (bmiValue < 18.5) status = 'Underweight';
    else if (bmiValue >= 18.5 && bmiValue < 25) status = 'Healthy';
    else if (bmiValue >= 25 && bmiValue < 30) status = 'Overweight';
    else status = 'Obese';

    setBmi({
      value: parseFloat(bmiValue.toFixed(1)),
      status
    });
    
    return { value: parseFloat(bmiValue.toFixed(1)), status };
  };

  // Load user profile from localStorage
  const loadUserProfile = () => {
    const profileData = localStorage.getItem('userProfile');
    if (profileData) {
      const profile = JSON.parse(profileData);
      setUserProfile(profile);
      
      // Calculate BMI
      calculateBMI(profile.weight, profile.height);
      
      // Update steps goal based on weight
      const newStepsGoal = calculateStepsGoal(profile.weight);
      setStepsGoal(newStepsGoal);
      
      // Update calories burned and goal based on current steps and weight
      const burned = calculateCaloriesBurned(steps, profile.weight);
      const caloriesGoal = calculateCaloriesGoal(newStepsGoal, profile.weight);
      setCaloriesBurned(burned);
      setCaloriesGoal(caloriesGoal);
    } else {
      // If no profile exists, prompt user to create one
      toast.error("Please update your profile to see accurate health metrics", {
        action: {
          label: "Update Profile",
          onClick: () => document.getElementById('profile-button')?.click()
        }
      });
    }
  };

  // Update both steps and calories when steps change
  useEffect(() => {
    if (userProfile && userProfile.weight) {
      const burned = calculateCaloriesBurned(steps, userProfile.weight);
      setCaloriesBurned(burned);
    }
  }, [steps, userProfile]);

  const loadTodayWaterLogs = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const logsRef = collection(db, 'waterLogs');
      const q = query(
        logsRef,
        where('userId', '==', userId),
        where('timestamp', '>=', today),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const logs: WaterLog[] = [];
      let total = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const log: WaterLog = {
          id: doc.id,
          amount: data.amount,
          timestamp: data.timestamp,
          userId: data.userId
        };
        logs.push(log);
        total += log.amount;
      });

      setWaterIntake({ total, logs });
    } catch (err) {
      console.error('Failed to load water logs:', err);
    }
  };

  const handleWaterIntakeUpdate = (amount: number) => {
    setWaterIntake(prev => ({
      ...prev,
      total: prev.total + amount
    }));
    loadTodayWaterLogs(); // Reload all logs
  };

  return (
    <TooltipProvider>
    <div className="container mx-auto px-4 py-8">
        {/* Enhanced Title Section with lighter colors */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 rounded-2xl p-8 mb-8 shadow-xl border border-blue-200 dark:border-blue-800"
        >
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.8),transparent_50%)]"></div>
          
          <div className="relative flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="p-3 bg-blue-500/10 dark:bg-white/10 rounded-xl backdrop-blur-sm">
                <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                Health Dashboard
                <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
        </h1>
              <p className="text-blue-700 dark:text-blue-300 text-lg">Your AI-Powered Health Companion</p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 flex items-center">
              <LineChart className="w-24 h-24 text-blue-500/20 animate-pulse" />
            </div>
          </div>

          {/* AI Feature Badges */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
              <Brain className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">AI Analysis Active</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
              <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Smart Insights</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
              <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Health Monitoring</span>
            </div>
          </div>

          {/* AI Health Tips */}
          <div className="mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Zap className="w-5 h-5" />
              <span className="font-medium">AI Health Tip:</span>
              <span className="text-sm">Regular exercise and proper hydration can improve your daily health score!</span>
            </div>
          </div>

          {/* Animated particles with adjusted colors */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-blue-400/20 dark:bg-blue-400/40 rounded-full"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animation: `float ${2 + Math.random() * 3}s infinite linear`
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Enhanced Health Score Section with more features */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 relative overflow-hidden group hover:shadow-xl transform-gpu transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Score */}
            <div className="relative">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Daily Health Score</h3>
                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  Today's Progress
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400">
                    Improving
                  </span>
                </p>
              </div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white w-32 h-32 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-lg relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer"></div>
                <div className="text-center">
                  <span className="block">48</span>
                  <span className="text-sm font-normal opacity-90">out of 100</span>
                </div>
              </motion.div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Score Breakdown
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Physical Activity</span>
                    <span className="text-blue-600 dark:text-blue-400">15/25</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Sleep Quality</span>
                    <span className="text-purple-600 dark:text-purple-400">12/25</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: '48%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Nutrition</span>
                    <span className="text-green-600 dark:text-green-400">18/25</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '72%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Mental Wellness</span>
                    <span className="text-pink-600 dark:text-pink-400">20/25</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div className="h-full bg-pink-500 rounded-full" style={{ width: '80%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Today's Recommendations
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <Activity className="w-4 h-4 text-blue-500 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">Take a 20-minute walk to improve your physical score</p>
                </div>
                <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <Clock className="w-4 h-4 text-purple-500 mt-0.5" />
                  <p className="text-sm text-purple-700 dark:text-purple-300">Try to get 7-8 hours of sleep tonight</p>
                </div>
                <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <Droplet className="w-4 h-4 text-green-500 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">Drink 500ml more water to meet your daily goal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">Weekly Progress</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>This Week</span>
                <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full ml-2"></span>
                <span>Last Week</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <div key={day} className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{day}</div>
                  <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg relative">
                    <div 
                      className="absolute bottom-0 w-full bg-blue-500 rounded-b-lg transition-all"
                      style={{ 
                        height: `${[60, 45, 75, 48, 80, 65, 45][i]}%`,
                        opacity: i <= 3 ? 1 : 0.5 
                      }}
                    ></div>
                    <div 
                      className="absolute bottom-0 w-full bg-gray-300 dark:bg-gray-600 rounded-b-lg -z-10"
                      style={{ height: `${[50, 55, 65, 45, 70, 60, 50][i]}%` }}
                    ></div>
                  </div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">
                    {[60, 45, 75, 48, 80, 65, 45][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Enhanced Metric Cards with AI Analysis and WHO Guidelines */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Heart Rate Card with WHO Guidelines */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative overflow-hidden group hover:shadow-2xl transform-gpu transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-xl transform group-hover:scale-150 transition-all duration-500"></div>
            
            {/* WHO Guidelines Overlay */}
            <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 flex flex-col justify-between pointer-events-none z-10">
              <div>
                <h5 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">WHO Heart Rate Guidelines</h5>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Maintaining a healthy heart rate is crucial for cardiovascular health:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      </span>
                      <span>Normal resting heart rate: 60-100 BPM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      </span>
                      <span>Athletes may have lower rates: 40-60 BPM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      </span>
                      <span>Monitor changes during exercise and rest</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mt-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  <span className="font-medium">Health Tip:</span> Regular cardiovascular exercise can help maintain a healthy resting heart rate.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Heart Rate
              </h4>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-xs font-medium text-red-700 dark:text-red-300">
                <Brain className="w-3 h-3" />
                Live Monitoring
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-red-500 mb-1">72 BPM</p>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600 dark:text-gray-400">Status: Normal</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400">
                    WHO Recommended
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>0</span>
                  <span>60</span>
                  <span>100</span>
                  <span>140</span>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                  <div className="absolute inset-0 flex">
                    <div className="bg-red-200/50 dark:bg-red-900/30 flex-1" style={{ width: '42.8%' }}></div>
                    <div className="bg-green-200/50 dark:bg-green-900/30 flex-1" style={{ width: '28.6%' }}></div>
                    <div className="bg-red-200/50 dark:bg-red-900/30 flex-1" style={{ width: '28.6%' }}></div>
                  </div>
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300"
                    style={{ width: '51.4%' }}
                  >
                    <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-lg"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-500">Too Low</span>
                  <span className="text-green-500">Normal Range</span>
                  <span className="text-red-500">Too High</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">WHO Range: 60-100 BPM</span>
                  <span className="text-red-600 dark:text-red-400">Peak: 125 BPM</span>
                </div>
              </div>

              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400">
                  <span className="font-medium">AI Analysis:</span> Your heart rate has been consistently within WHO recommended range.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Blood Pressure Card with WHO Guidelines */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative overflow-hidden group hover:shadow-2xl transform-gpu transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl transform group-hover:scale-150 transition-all duration-500"></div>
            
            {/* WHO Guidelines Overlay */}
            <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 flex flex-col justify-between pointer-events-none z-10">
              <div>
                <h5 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-2">WHO Blood Pressure Guidelines</h5>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Maintaining a healthy blood pressure is crucial for cardiovascular health:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      </span>
                      <span>Normal blood pressure: &lt;120/80 mmHg</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      </span>
                      <span>Elevated: 120-129/80-89 mmHg</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      </span>
                      <span>Stage 1: 130-139/80-89 mmHg</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      </span>
                      <span>Stage 2: ≥140/≥90 mmHg</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 mt-4">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  <span className="font-medium">Health Tip:</span> Regular cardiovascular exercise and a healthy diet can help maintain a healthy blood pressure.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Blood Pressure
              </h4>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Brain className="w-3 h-3" />
                AI Monitored
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-emerald-500 mb-1">120/80</p>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600 dark:text-gray-400">Status: Normal</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400">
                    WHO Normal Range
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">Systolic</span>
                    <span className="text-xs text-gray-500">120 mmHg</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 flex">
                      <div className="bg-green-200/50 dark:bg-green-900/30 flex-1" style={{ width: '40%' }}></div>
                      <div className="bg-yellow-200/50 dark:bg-yellow-900/30 flex-1" style={{ width: '20%' }}></div>
                      <div className="bg-orange-200/50 dark:bg-orange-900/30 flex-1" style={{ width: '20%' }}></div>
                      <div className="bg-red-200/50 dark:bg-red-900/30 flex-1" style={{ width: '20%' }}></div>
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: '60%' }}
                    >
                      <div className="w-2 h-2 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-lg"></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-emerald-500">&lt;120</span>
                    <span className="text-yellow-500">120-129</span>
                    <span className="text-orange-500">130-139</span>
                    <span className="text-red-500">&gt;140</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">Diastolic</span>
                    <span className="text-xs text-gray-500">80 mmHg</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 flex">
                      <div className="bg-green-200/50 dark:bg-green-900/30 flex-1" style={{ width: '40%' }}></div>
                      <div className="bg-yellow-200/50 dark:bg-yellow-900/30 flex-1" style={{ width: '20%' }}></div>
                      <div className="bg-orange-200/50 dark:bg-orange-900/30 flex-1" style={{ width: '20%' }}></div>
                      <div className="bg-red-200/50 dark:bg-red-900/30 flex-1" style={{ width: '20%' }}></div>
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: '50%' }}
                    >
                      <div className="w-2 h-2 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-lg"></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-emerald-500">&lt;80</span>
                    <span className="text-yellow-500">80-84</span>
                    <span className="text-orange-500">85-89</span>
                    <span className="text-red-500">&gt;90</span>
                  </div>
                </div>
              </div>

              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="font-medium">AI Analysis:</span> Your blood pressure is in the normal range (120/80 mmHg).
                </p>
              </div>
            </div>
          </motion.div>

          {/* BMI Card with WHO Guidelines */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative overflow-hidden group hover:shadow-2xl transform-gpu transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/10 rounded-full blur-xl transform group-hover:scale-150 transition-all duration-500"></div>
            
            {/* WHO Guidelines Overlay */}
            <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 flex flex-col justify-between pointer-events-none z-10">
              <div>
                <h5 className="text-lg font-semibold text-violet-600 dark:text-violet-400 mb-2">WHO BMI Guidelines</h5>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Maintaining a healthy BMI is crucial for overall health:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      </span>
                      <span>Normal BMI: 18.5-24.9</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      </span>
                      <span>Overweight: 25-29.9</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      </span>
                      <span>Obesity: ≥30</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 mt-4">
                <p className="text-sm text-violet-600 dark:text-violet-400">
                  <span className="font-medium">Health Tip:</span> Incorporating regular physical activity and a balanced diet can help maintain a healthy BMI.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Scale className="w-5 h-5 text-violet-500" />
                BMI
              </h4>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-xs font-medium text-violet-700 dark:text-violet-300">
                <Brain className="w-3 h-3" />
                AI Calculated
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-violet-500 mb-1">{bmi.value.toFixed(1)}</p>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600 dark:text-gray-400">Status: {bmi.status}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    bmi.status === 'Healthy' ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400' :
                    bmi.status === 'Underweight' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-400' :
                    bmi.status === 'Overweight' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-400'
                  }`}>
                    {bmi.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>&lt;18.5</span>
                  <span>18.5-24.9</span>
                  <span>25-29.9</span>
                  <span>&gt;30</span>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                  <div className="absolute inset-0 flex">
                    <div className="bg-blue-200/50 dark:bg-blue-900/30" style={{ width: '20%' }}></div>
                    <div className="bg-green-200/50 dark:bg-green-900/30" style={{ width: '30%' }}></div>
                    <div className="bg-yellow-200/50 dark:bg-yellow-900/30" style={{ width: '25%' }}></div>
                    <div className="bg-red-200/50 dark:bg-red-900/30" style={{ width: '25%' }}></div>
                  </div>
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-300"
                    style={{ width: '47%' }}
                  >
                    <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-lg"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-500">Underweight</span>
                  <span className="text-green-500">Healthy</span>
                  <span className="text-yellow-500">Overweight</span>
                  <span className="text-red-500">Obese</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                  <p className="text-xs text-violet-600 dark:text-violet-400">Height</p>
                  <p className="font-semibold text-violet-700 dark:text-violet-300">
                    {userProfile?.height.toFixed(2)} m
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                  <p className="text-xs text-violet-600 dark:text-violet-400">Weight</p>
                  <p className="font-semibold text-violet-700 dark:text-violet-300">
                    {userProfile?.weight} kg
                  </p>
                </div>
              </div>

              <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                <p className="text-xs text-violet-600 dark:text-violet-400">
                  <span className="font-medium">AI Analysis:</span> {
                    bmi.status === 'Healthy' ? 'Your BMI indicates a healthy weight range.' :
                    bmi.status === 'Underweight' ? 'Consider consulting a nutritionist for healthy weight gain.' :
                    bmi.status === 'Overweight' ? 'Focus on balanced diet and regular exercise.' :
                    'Consider consulting a healthcare provider for weight management.'
                  }
                </p>
              </div>
            </div>
          </motion.div>

          {/* Steps Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative overflow-hidden group hover:shadow-2xl transform-gpu transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-xl transform group-hover:scale-150 transition-all duration-500"></div>
            
            {/* WHO Guidelines Overlay */}
            <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 flex flex-col justify-between pointer-events-none z-10">
              <div>
                <h5 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">WHO Steps Guidelines</h5>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    The World Health Organization recommends:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      </span>
                      <span>Aim for 10,000 steps daily for optimal health benefits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      </span>
                      <span>Break long sitting periods with short walks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      </span>
                      <span>Incorporate walking meetings and active commuting</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 mt-4">
                <p className="text-sm text-green-600 dark:text-green-400">
                  <span className="font-medium">Quick Tip:</span> Walking 10 minutes every hour can help you reach your daily goal while improving focus and energy levels.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Steps
              </h4>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-xs font-medium text-green-700 dark:text-green-300">
                <Brain className="w-3 h-3" />
                AI Tracked
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-green-500 mb-1">{steps.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600 dark:text-gray-400">Daily Goal: {stepsGoal.toLocaleString()}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400">
                    {steps >= stepsGoal ? 'Achieved' : 'On Track'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((steps / stepsGoal) * 100, 100)}%` }}
                  >
                    <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-lg"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>0</span>
                  <span>{Math.round(stepsGoal / 2).toLocaleString()}</span>
                  <span>{stepsGoal.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-green-600 dark:text-green-400">
                  <span className="font-medium">AI Analysis:</span> Based on your weight of {userProfile?.weight}kg, your daily step goal is {stepsGoal.toLocaleString()} steps.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Calories Burned Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative overflow-hidden group hover:shadow-2xl transform-gpu transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-xl transform group-hover:scale-150 transition-all duration-500"></div>
            
            {/* WHO Guidelines Overlay */}
            <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 flex flex-col justify-between pointer-events-none z-10">
              <div>
                <h5 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-2">WHO Calories Burned Guidelines</h5>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Maintaining a healthy calorie burn is crucial for overall health:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      </span>
                      <span>Aim for 2,000 kcal daily for optimal health benefits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      </span>
                      <span>Break long sedentary periods with short bursts of activity</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      </span>
                      <span>Incorporate active commuting and household chores</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 mt-4">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  <span className="font-medium">Health Tip:</span> Regular physical activity can help maintain a healthy calorie burn.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                Calories Burned
              </h4>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-medium text-orange-700 dark:text-orange-300">
                <Brain className="w-3 h-3" />
                AI Tracked
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-orange-500 mb-1">{caloriesBurned.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600 dark:text-gray-400">Daily Goal: {caloriesGoal.toLocaleString()}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800/30 dark:text-orange-400">
                    In Progress
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full transition-all duration-300"
                    style={{ width: '62.4%' }}
                  >
                    <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-lg"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>0</span>
                  <span>1,000</span>
                  <span>2,000</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <p className="text-xs text-orange-600 dark:text-orange-400">Last Hour</p>
                  <p className="font-semibold text-orange-700 dark:text-orange-300">156 cal</p>
                </div>
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <p className="text-xs text-orange-600 dark:text-orange-400">Active Time</p>
                  <p className="font-semibold text-orange-700 dark:text-orange-300">3h 45m</p>
                </div>
              </div>

              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  <span className="font-medium">AI Analysis:</span> You're burning calories 15% faster than your hourly average.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Blood Glucose Card with WHO Guidelines */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative overflow-hidden group hover:shadow-2xl transform-gpu transition-all duration-300 hover:scale-[1.02] cursor-pointer col-span-3"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl transform group-hover:scale-150 transition-all duration-500"></div>
            
            {/* WHO Guidelines Overlay */}
            <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 flex flex-col justify-between pointer-events-none z-10">
              <div>
                <h5 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-2">WHO Blood Glucose Guidelines</h5>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Maintaining healthy blood glucose levels is crucial for overall health:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      </span>
                      <span>Normal fasting blood glucose: 70-100 mg/dL</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      </span>
                      <span>Normal post-prandial (2h after meal): &lt;140 mg/dL</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      </span>
                      <span>Monitor changes and maintain a healthy lifestyle</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mt-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  <span className="font-medium">Health Tip:</span> Regular physical activity and a balanced diet can help maintain healthy blood glucose levels.
                </p>
              </div>
        </div>

            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Beaker className="w-5 h-5 text-amber-500" />
                Blood Glucose Levels
              </h4>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-xs font-medium text-amber-700 dark:text-amber-300">
                <Brain className="w-3 h-3" />
                AI Monitored
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-3xl font-bold text-amber-500">95 mg/dL</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Fasting Blood Glucose</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-gray-500">Last checked: 8h ago</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>70</span>
                    <span>100</span>
                    <span>125</span>
                    <span>126+</span>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 flex">
                      <div className="bg-green-200/50 dark:bg-green-900/30" style={{ width: '40%' }}></div>
                      <div className="bg-yellow-200/50 dark:bg-yellow-900/30" style={{ width: '30%' }}></div>
                      <div className="bg-red-200/50 dark:bg-red-900/30" style={{ width: '30%' }}></div>
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                      style={{ width: '38%' }}
                    >
                      <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-lg"></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-green-500">Normal</span>
                    <span className="text-yellow-500">Prediabetes</span>
                    <span className="text-red-500">Diabetes</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-3xl font-bold text-amber-500">135 mg/dL</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Post-Prandial (PP)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-gray-500">Last checked: 2h ago</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>&lt;140</span>
                    <span>140-199</span>
                    <span>&gt;200</span>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 flex">
                      <div className="bg-green-200/50 dark:bg-green-900/30" style={{ width: '40%' }}></div>
                      <div className="bg-yellow-200/50 dark:bg-yellow-900/30" style={{ width: '30%' }}></div>
                      <div className="bg-red-200/50 dark:bg-red-900/30" style={{ width: '30%' }}></div>
                    </div>
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                      style={{ width: '38%' }}
                    >
                      <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-lg"></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-green-500">Normal</span>
                    <span className="text-yellow-500">Prediabetes</span>
                    <span className="text-red-500">Diabetes</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg mt-4">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  <span className="font-medium">AI Analysis:</span> Your fasting blood glucose (95 mg/dL) and post-prandial levels (135 mg/dL) are within normal range.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative overflow-hidden group hover:shadow-2xl transform-gpu transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl transform group-hover:scale-150 transition-opacity"></div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Medications
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage your medications</p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-xs font-medium text-purple-700 dark:text-purple-300">
                <Brain className="w-3 h-3" />
                Smart Reminders
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                <p className="text-gray-600 dark:text-gray-400 text-sm">No medications recorded for today</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Activity className="w-4 h-4" />
                <span>AI will help track your medication schedule</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:to-pink-500 group-hover:text-white transition-all duration-300"
                onClick={() => setShowMedicationsModal(true)}
              >
                Add Medication
              </Button>
              <Button
                variant="outline"
                className="group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30"
                onClick={() => setShowMedicationsModal(true)}
              >
                View History
              </Button>
            </div>
          </motion.div>

          {/* WATER INTAKE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 relative overflow-hidden group hover:shadow-2xl transform-gpu transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl transform group-hover:scale-150 transition-opacity"></div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-blue-500" />
                  Water Intake
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your daily hydration</p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300">
                <Brain className="w-3 h-3" />
                AI Monitoring
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">0 ml</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">of 2000 ml goal</p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      className="text-gray-200 dark:text-gray-700"
                      strokeWidth="5"
                      stroke="currentColor"
                      fill="transparent"
                      r="27"
                      cx="32"
                      cy="32"
                    />
                    <circle
                      className="text-blue-500"
                      strokeWidth="5"
                      strokeDasharray={170}
                      strokeDashoffset={170 * (1 - 0)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="27"
                      cx="32"
                      cy="32"
                    />
                  </svg>
                  <Droplet className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-600 dark:text-blue-400">AI Recommendation: Drink water every 2 hours</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-cyan-500 group-hover:text-white transition-all duration-300"
                onClick={() => setShowWaterIntakeModal(true)}
              >
                Log Intake
              </Button>
              <Button
                variant="outline"
                className="group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"
                onClick={() => setShowWaterIntakeModal(true)}
              >
                View History
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Modals */}
        <MedicationsModal 
          isOpen={showMedicationsModal} 
          onClose={() => setShowMedicationsModal(false)} 
        />
        <WaterIntakeModal 
          isOpen={showWaterIntakeModal} 
          onClose={() => setShowWaterIntakeModal(false)}
          onUpdate={handleWaterIntakeUpdate}
          currentIntake={waterIntake.total}
          intakeLogs={waterIntake.logs}
          weight={72} // This should come from user profile
        />
      </div>
    </TooltipProvider>
  );
}
