import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';
import Navbar from '@/components/layout/Navbar';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import '@/styles/theme.css';
import { ThemeProvider } from "@/components/theme-provider"
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Lazy load components
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const Chat = lazy(() => import('@/pages/Chat'));
const NotFound = lazy(() => import('@/pages/not-found'));
const ProfileRegistration = lazy(() => import('@/components/profile/ProfileRegistration'));
const Settings = lazy(() => import('@/pages/Settings'));

// Loading Fallback Component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
    <div className="space-y-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="text-blue-600 dark:text-blue-400 font-medium">Loading...</p>
    </div>
  </div>
);

function App() {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Load profile from Firestore instead of localStorage
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            localStorage.setItem('userProfile', JSON.stringify(userData.profile));
          }
        } catch (error) {
          console.error("Error loading profile:", error);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleProfileModalClose = () => {
    setShowProfileModal(false);
    // Save modal state to prevent reopening
    localStorage.setItem('profileModalShown', 'true');
  };

  if (loading) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <LoadingFallback />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {!loading && (
            <Navbar 
              onProfileClick={() => setShowProfileModal(true)}
            />
          )}
          <main className="container py-6 px-8 md:px-12 lg:px-16 max-w-6xl mx-auto">
            <div className="space-y-6">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route 
                    path="/login" 
                    element={!user ? <Login /> : <Navigate to="/dashboard" />} 
                  />
                  <Route 
                    path="/dashboard" 
                    element={user ? <Dashboard /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/chat" 
                    element={user ? <Chat /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/symptoms" 
                    element={user ? <NotFound /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/settings" 
                    element={user ? <Settings /> : <Navigate to="/login" />} 
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </div>
          </main>
          {user && (
            <Suspense fallback={<LoadingFallback />}>
              <ProfileRegistration 
                isOpen={showProfileModal} 
                onClose={handleProfileModalClose} 
              />
            </Suspense>
          )}
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;