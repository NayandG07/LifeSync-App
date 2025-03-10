import { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Minus, 
  Clock, 
  X, 
  AlertCircle,
  Droplet,
  History
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  orderBy,
  limit 
} from 'firebase/firestore';

interface WaterLog {
  id: string;
  amount: number;
  timestamp: Timestamp;
}

interface WaterIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (amount: number) => void;
  currentIntake?: number;
  intakeLogs?: WaterLog[];
  weight?: number;
}

const PRESET_AMOUNTS = [
  { label: '100 mL', value: 100 },
  { label: '200 mL', value: 200 },
  { label: '500 mL', value: 500 },
  { label: '1 L', value: 1000 }
];

export default function WaterIntakeModal({ 
  isOpen, 
  onClose, 
  onUpdate = () => {},
  currentIntake = 0,
  intakeLogs = [],
  weight = 70 
}: WaterIntakeModalProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<WaterLog[]>(intakeLogs);

  // Calculate recommended daily intake based on WHO guidelines (30ml per kg)
  const recommendedIntake = weight * 30;

  useEffect(() => {
    if (isOpen) {
      loadWaterLogs();
    }
  }, [isOpen]);

  const loadWaterLogs = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const logsRef = collection(db, 'waterLogs');
      const q = query(
        logsRef,
        where('userId', '==', userId),
        where('timestamp', '>=', today),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      const fetchedLogs: WaterLog[] = [];
      querySnapshot.forEach((doc) => {
        fetchedLogs.push({ id: doc.id, ...doc.data() } as WaterLog);
      });

      setLogs(fetchedLogs);
    } catch (err) {
      console.error('Failed to load water logs:', err);
      setError('Failed to load water logs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWater = async (amount: number) => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const newLog = {
        userId,
        amount,
        timestamp: Timestamp.now()
      };

      await addDoc(collection(db, 'waterLogs'), newLog);
      
      // Update the parent component first
      onUpdate(amount);
      
      // Clear custom amount if any
      setCustomAmount('');
      
      // Then reload logs
      await loadWaterLogs();
      
    } catch (err) {
      console.error('Failed to log water intake:', err);
      setError('Failed to log water intake');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAmountSubmit = () => {
    const amount = parseInt(customAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    handleAddWater(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Water Intake</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* WHO Guidelines Info */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">WHO Recommendation</h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            The World Health Organization recommends drinking 30ml of water per kilogram of body weight daily.
            Based on your weight ({weight}kg), your recommended intake is {recommendedIntake}ml.
          </p>
        </div>

        {/* Progress Section */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Today's Progress</h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Goal: {(recommendedIntake / 1000).toFixed(1)}L
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{(currentIntake / 1000).toFixed(1)}L</p>
              <p className="text-sm text-blue-500">
                {((currentIntake / recommendedIntake) * 100).toFixed(0)}% of daily goal
              </p>
            </div>
          </div>
          <div className="h-4 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((currentIntake / recommendedIntake) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Quick Add</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PRESET_AMOUNTS.map((preset) => (
              <Button
                key={preset.value}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => handleAddWater(preset.value)}
                disabled={loading}
              >
                <Droplet className="w-5 h-5 text-blue-500" />
                <span>{preset.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Custom Amount</h3>
          <div className="flex gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const current = parseInt(customAmount) || 0;
                  setCustomAmount(Math.max(0, current - 50).toString());
                }}
                disabled={loading}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                placeholder="Enter amount in mL"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="text-center"
                disabled={loading}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const current = parseInt(customAmount) || 0;
                  setCustomAmount((current + 50).toString());
                }}
                disabled={loading}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              onClick={handleCustomAmountSubmit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading || !customAmount}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Recent History */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent History
          </h3>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Loading logs...</p>
              </div>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <div 
                  key={log.id}
                  className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Droplet className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {log.amount} mL
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {log.timestamp.toDate().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No logs for today
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 