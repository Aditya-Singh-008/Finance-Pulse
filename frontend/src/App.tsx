import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import AuthForm from './components/auth/AuthForm';
import AppLayout from './components/layout/AppLayout';
import MainLayout from './components/layout/MainLayout';
import LedgerPage from './components/dashboard/LedgerPage';

import { Toaster } from 'react-hot-toast';

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
        </Router>
    );
};

export default App;
