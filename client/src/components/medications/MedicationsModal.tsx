import { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { 
  Plus, 
  Clock, 
  Check, 
  Pencil, 
  Trash2, 
  X,
  AlertCircle 
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';

interface Medication {
  id: string;
  name: string;
  frequency: string;
  taken: boolean;
  takenAt?: Timestamp;
}

interface MedicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every morning',
  'Every night',
  'As needed'
];

export default function MedicationsModal({ isOpen, onClose }: MedicationsModalProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedFreq, setNewMedFreq] = useState(FREQUENCY_OPTIONS[0]);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [takenMeds, setTakenMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMedications();
    }
  }, [isOpen]);

  const loadMedications = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const medsRef = collection(db, 'medications');
      const q = query(medsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const meds: Medication[] = [];
      const taken: Medication[] = [];
      
      querySnapshot.forEach((doc) => {
        const med = { id: doc.id, ...doc.data() } as Medication;
        if (med.taken && med.takenAt) {
          // Only include medications taken today
          const takenDate = med.takenAt.toDate();
          const today = new Date();
          if (takenDate.toDateString() === today.toDateString()) {
            taken.push(med);
          }
        }
        meds.push(med);
      });

      setMedications(meds);
      setTakenMeds(taken);
    } catch (err) {
      setError('Failed to load medications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addMedication = async () => {
    try {
      if (!newMedName.trim()) {
        setError('Please enter a medication name');
        return;
      }

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const medsRef = collection(db, 'medications');
      await addDoc(medsRef, {
        userId,
        name: newMedName.trim(),
        frequency: newMedFreq,
        taken: false,
        createdAt: Timestamp.now()
      });

      setNewMedName('');
      loadMedications();
    } catch (err) {
      setError('Failed to add medication');
      console.error(err);
    }
  };

  const updateMedication = async (medication: Medication) => {
    try {
      const medRef = doc(db, 'medications', medication.id);
      await updateDoc(medRef, {
        name: medication.name,
        frequency: medication.frequency
      });
      setEditingMed(null);
      loadMedications();
    } catch (err) {
      setError('Failed to update medication');
      console.error(err);
    }
  };

  const deleteMedication = async (id: string) => {
    try {
      const medRef = doc(db, 'medications', id);
      await deleteDoc(medRef);
      loadMedications();
    } catch (err) {
      setError('Failed to delete medication');
      console.error(err);
    }
  };

  const markAsTaken = async (medication: Medication) => {
    try {
      const medRef = doc(db, 'medications', medication.id);
      await updateDoc(medRef, {
        taken: true,
        takenAt: Timestamp.now()
      });
      loadMedications();
    } catch (err) {
      setError('Failed to mark medication as taken');
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medications</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Add New Medication */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">Add New Medication</h3>
          <div className="flex gap-4">
            <Input
              placeholder="Medication name"
              value={newMedName}
              onChange={(e) => setNewMedName(e.target.value)}
              className="flex-1"
            />
            <Select
              value={newMedFreq}
              onValueChange={setNewMedFreq}
              options={FREQUENCY_OPTIONS}
              className="w-48"
            />
            <Button onClick={addMedication} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Current Medications */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Current Medications</h3>
          <div className="space-y-3">
            {medications.map((med) => (
              <div 
                key={med.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between"
              >
                {editingMed?.id === med.id ? (
                  <div className="flex-1 flex gap-4">
                    <Input
                      value={editingMed.name}
                      onChange={(e) => setEditingMed({ ...editingMed, name: e.target.value })}
                      className="flex-1"
                    />
                    <Select
                      value={editingMed.frequency}
                      onValueChange={(value) => setEditingMed({ ...editingMed, frequency: value })}
                      options={FREQUENCY_OPTIONS}
                      className="w-48"
                    />
                    <Button onClick={() => updateMedication(editingMed)} className="bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingMed(null)}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{med.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {med.frequency}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsTaken(med)}
                        disabled={med.taken}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {med.taken ? 'Taken' : 'Mark as taken'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingMed(med)}
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMedication(med.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {medications.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No medications added yet
              </p>
            )}
          </div>
        </div>

        {/* Taken Today */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Taken Today</h3>
          <div className="space-y-3">
            {takenMeds.map((med) => (
              <div 
                key={med.id}
                className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">{med.name}</p>
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {med.takenAt?.toDate().toLocaleTimeString()}
                  </p>
                </div>
                <Check className="w-5 h-5 text-green-500" />
              </div>
            ))}
            {takenMeds.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No medications taken today
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 