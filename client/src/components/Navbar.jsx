import React from 'react';

export default function Navbar({ user, activeTab, onTabChange, onLogout, stats }) {
  return (
    <header className="bg-[#060c1a] border-b border-[#1e2f4a] sticky top-0 z-40 shadow-lg">
      {/* Top Row: Brand & Profile Info */}
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4 border-b border-[#1e2f4a]/40 flex-wrap">
        {/* Left: Brand & Location */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="text-xl font-extrabold text-[#14b8a6] flex items-center gap-2 tracking-tight">
            <span>🏛️</span>
            <span>Civic Issue Intelligence</span>
          </div>

          <div className="text-xs text-[#f59e0b] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 shadow-sm">
            <span>📍</span>
            <span>{stats?.panchayat_name || 'Dharmajigudem Gram Panchayat'} • {stats?.mandal || 'Lingapalem'} Mandal, {stats?.district || 'West Godavari'}</span>
          </div>
        </div>

        {/* Right: Active User Session */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-[#0e172a] border border-[#1e2f4a] px-3.5 py-1.5 rounded-full text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              <span className="text-[#8899bb]">
                {user.role === 'admin' ? 'Secretary:' : user.role === 'ward_officer' ? 'Officer:' : 'Citizen:'}
              </span>
              <strong className="text-white font-semibold">{user.full_name}</strong>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                  user.role === 'admin'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : user.role === 'ward_officer'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                }`}
              >
                {user.role}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="border border-[#1e2f4a] bg-[#0e172a] hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 text-[#8899bb] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        ) : null}
      </div>

      {/* Bottom Row: Dashboard Tabs with Access Indicators */}
      <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-[#0e172a] p-1.5 rounded-xl border border-[#1e2f4a] shadow-inner">
          {/* Citizen Tab */}
          <button
            onClick={() => onTabChange('citizen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'citizen'
                ? 'bg-[#0d9488] text-white shadow-md'
                : 'text-[#8899bb] hover:text-white hover:bg-[#131f38]'
            }`}
          >
            <span>👤 Citizen Portal</span>
          </button>

          {/* Ward Tasks Tab */}
          <button
            onClick={() => onTabChange('ward')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ward'
                ? 'bg-[#0d9488] text-white shadow-md'
                : 'text-[#8899bb] hover:text-white hover:bg-[#131f38]'
            }`}
          >
            <span>👷 Ward Tasks</span>
            {user?.role !== 'ward_officer' && (
              <span
                title="Restricted: Requires Ward Officer credentials"
                className="text-[10px] bg-black/40 text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded font-normal"
              >
                🔒 Officer
              </span>
            )}
          </button>

          {/* Secretary Oversight Tab */}
          <button
            onClick={() => onTabChange('secretary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'secretary'
                ? 'bg-[#0d9488] text-white shadow-md'
                : 'text-[#8899bb] hover:text-white hover:bg-[#131f38]'
            }`}
          >
            <span>🏛️ Secretary Oversight</span>
            {user?.role !== 'admin' && (
              <span
                title="Restricted: Requires Panchayat Secretary credentials"
                className="text-[10px] bg-black/40 text-purple-400 border border-purple-400/30 px-1.5 py-0.5 rounded font-normal"
              >
                🔒 Secretary
              </span>
            )}
          </button>
        </div>

        {/* Status indicator on the right */}
        <div className="text-xs text-[#8899bb] hidden sm:flex items-center gap-2">
          <span className="text-[#14b8a6]">●</span>
          <span>
            Active View:{' '}
            <strong className="text-white">
              {activeTab === 'citizen'
                ? 'Citizen Grievance Submission'
                : activeTab === 'ward'
                ? 'Ward Sachivalayam Field Board'
                : 'Panchayat Secretary Municipal Audit'}
            </strong>
          </span>
        </div>
      </div>
    </header>
  );
}
