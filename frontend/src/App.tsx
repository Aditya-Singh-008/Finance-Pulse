import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import { Toaster } from 'react-hot-toast';

const AuthForm = React.lazy(() => import('./components/auth/AuthForm'));
const AppLayout = React.lazy(() => import('./components/layout/AppLayout'));
const MainLayout = React.lazy(() => import('./components/layout/MainLayout'));
const LedgerPage = React.lazy(() => import('./components/dashboard/LedgerPage'));

const App: React.FC = () => {
    return (
        <Router>
            <Toaster 
                position="top-center" 
                reverseOrder={false} 
                toastOptions={{
                    className: 'dark:bg-slate-900 dark:text-white',
                    duration: 4000,
                }}
            />
            <React.Suspense
                fallback={(
                    <div role="status" className="grid min-h-screen place-items-center bg-paper text-slate-600 dark:bg-slate-950 dark:text-slate-200">
                        Opening Finance Pulse…
                    </div>
                )}
            >
                <Routes>
                {/* Public Route */}
                <Route path="/" element={<Landing />} />
                
                {/* Auth Route */}
                <Route path="/auth" element={<AuthForm />} />
                
                {/* Private App Routes */}
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<MainLayout />} />
                    <Route path="/transactions" element={<LedgerPage />} />
                </Route>

                {/* Catch all redirect to landing */}
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </React.Suspense>
        </Router>
    );
};

export default App;
