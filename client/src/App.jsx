import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import StatsGrid from './components/StatsGrid';
import AuthModal from './components/AuthModal';
import CitizenPortal from './components/CitizenPortal';
import WardPortal from './components/WardPortal';
import SecretaryDashboard from './components/SecretaryDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('citizen'); // 'citizen' | 'ward' | 'secretary'
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Authentication Privacy Gate for restricted dashboard tabs
  const [authGate, setAuthGate] = useState(null);
  // null = closed, or { requiredRole: 'ward_officer'|'admin', restrictedMessage: '...', targetTab: 'ward'|'secretary' }

  // Fetch live stats & issues from Node.js backend
  const fetchAllData = useCallback(async () => {
    try {
      const [statsRes, issuesRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/stats'),
        fetch('http://127.0.0.1:8000/api/issues'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setIssues(issuesData.issues || []);
      }
    } catch (err) {
      console.warn('Backend fetch warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Initial login handler
  const handleInitialLogin = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'ward_officer') {
      setActiveTab('ward');
    } else if (loggedInUser.role === 'admin') {
      setActiveTab('secretary');
    } else {
      setActiveTab('citizen');
    }
    fetchAllData();
  };

  // Privacy Protected Tab Switcher
  const handleTabChange = (targetTab) => {
    // 1. Citizen Portal: open to citizens or any active session
    if (targetTab === 'citizen') {
      setActiveTab('citizen');
      return;
    }

    // 2. Ward Tasks: strictly requires ward_officer credentials
    if (targetTab === 'ward') {
      if (user?.role === 'ward_officer') {
        setActiveTab('ward');
      } else {
        setAuthGate({
          requiredRole: 'ward_officer',
          restrictedMessage:
            '🔒 Ward Officer Access Required: Please sign in with your official Ward Sachivalayam account to view assigned ward tasks.',
          targetTab: 'ward',
        });
      }
      return;
    }

    // 3. Secretary Oversight: strictly requires admin/secretary credentials
    if (targetTab === 'secretary') {
      if (user?.role === 'admin') {
        setActiveTab('secretary');
      } else {
        setAuthGate({
          requiredRole: 'admin',
          restrictedMessage:
            '🔒 Panchayat Secretary Access Required: Please sign in with your Secretary credentials to inspect municipal audit logs.',
          targetTab: 'secretary',
        });
      }
      return;
    }
  };

  // Handle successful login from Auth Gate
  const handleAuthGateSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    const destination = authGate?.targetTab || 'citizen';
    setActiveTab(destination);
    setAuthGate(null);
    fetchAllData();
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setActiveTab('citizen');
    setAuthGate(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070d1c] text-[#f0f6ff]">
      {/* 1. Initial Login Modal (when completely logged out) */}
      {!user && (
        <AuthModal
          onLoginSuccess={handleInitialLogin}
          requiredRole="citizen"
        />
      )}

      {/* 2. Privacy Gate Modal (when switching to restricted Ward/Secretary dashboard) */}
      {user && authGate && (
        <AuthModal
          onLoginSuccess={handleAuthGateSuccess}
          requiredRole={authGate.requiredRole}
          restrictedMessage={authGate.restrictedMessage}
          onCancel={() => setAuthGate(null)}
        />
      )}

      {/* Main Header / Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        stats={stats}
      />

      {/* Body Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Real-time Stats Grid */}
        <StatsGrid stats={stats} />

        {/* Tab 1: Citizen Issue Reporting & GIS Map */}
        {activeTab === 'citizen' && (
          <CitizenPortal
            user={user}
            issues={issues}
            onIssueCreated={fetchAllData}
          />
        )}

        {/* Tab 2: Ward Officer Task Board & SSIM AI Verification */}
        {activeTab === 'ward' && (
          <WardPortal
            user={user}
            onTaskResolved={fetchAllData}
          />
        )}

        {/* Tab 3: Panchayat Secretary SLA Oversight & Audit */}
        {activeTab === 'secretary' && (
          <SecretaryDashboard
            stats={stats}
            issues={issues}
            onRefresh={fetchAllData}
          />
        )}
      </main>

      <footer className="text-center py-4 border-t border-[#1e2f4a] text-xs text-[#8899bb] bg-[#060c1a]">
        Civic Issue Intelligence &amp; Automated Resolution System • Dharmajigudem Gram Panchayat (Linapalem Mandal, West Godavari)
      </footer>
    </div>
  );
}
