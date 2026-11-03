import React from 'react';

export default function StatsGrid({ stats }) {
  if (!stats) return null;

  const items = [
    {
      title: 'Total Complaints (Panchayat)',
      value: stats.total_issues || 0,
      sub: 'Across all 3 wards',
      color: '#f59e0b',
      borderGrad: 'from-[#0d9488] to-[#38bdf8]',
      icon: '📊',
    },
    {
      title: 'Pending SLA Issues',
      value: stats.pending_issues || 0,
      sub: 'Under active field repair',
      color: '#ef4444',
      borderGrad: 'from-[#ef4444] to-[#f59e0b]',
      icon: '⏳',
    },
    {
      title: 'AI Verified & Resolved',
      value: stats.resolved_issues || 0,
      sub: 'SSIM > 80% visual check',
      color: '#10b981',
      borderGrad: 'from-[#10b981] to-[#0d9488]',
      icon: '✅',
    },
    {
      title: 'DBSCAN Duplicates Suppressed',
      value: stats.duplicates_suppressed || 0,
      sub: '50m Spatial Clustering',
      color: '#a78bfa',
      borderGrad: 'from-[#a78bfa] to-[#38bdf8]',
      icon: '🔄',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-[#0e172a] border border-[#1e2f4a] rounded-2xl relative pt-6 pb-5 px-6 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[#14b8a6]/40 hover:shadow-xl hover:shadow-[#070d1c]"
        >
          {/* Top colored accent line with proper breathing room */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.borderGrad}`} />
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] uppercase tracking-wider text-[#8899bb] font-bold">
              {item.title}
            </span>
            <span className="text-base opacity-80">{item.icon}</span>
          </div>

          <div
            className="text-3xl font-extrabold tracking-tight mb-1"
            style={{ color: item.color }}
          >
            {item.value}
          </div>

          <div className="text-xs text-[#8899bb]/80 font-medium">
            {item.sub}
          </div>
        </div>
      ))}
    </div>
  );
}
