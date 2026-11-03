import React from 'react';

export default function SecretaryDashboard({ stats, issues, onRefresh }) {
  const wardBreakdown = stats?.ward_breakdown || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Ward Performance Summary Table */}
      <div className="card">
        <div className="card-title">
          <span>🏛️ Gram Panchayat Ward Performance &amp; SLA Breakdown</span>
          <button
            onClick={onRefresh}
            className="text-xs text-[#14b8a6] hover:underline cursor-pointer bg-[rgba(20,184,166,0.1)] px-3 py-1 rounded"
          >
            🔄 Refresh Data
          </button>
        </div>

        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Ward Number</th>
                <th>Ward Name</th>
                <th>Ward Member / Sachivalayam</th>
                <th>Total Issues</th>
                <th>Resolved</th>
                <th>Pending</th>
                <th>Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              {wardBreakdown.map((w) => {
                const rate = w.total_issues > 0 ? Math.round((w.resolved_issues / w.total_issues) * 100) : 100;
                return (
                  <tr key={w.ward_id}>
                    <td><strong>Ward {w.ward_id}</strong></td>
                    <td>{w.ward_name}</td>
                    <td className="text-[#8899bb]">{w.ward_member || 'Sachivalayam Staff'}</td>
                    <td><strong className="text-[#f59e0b]">{w.total_issues}</strong></td>
                    <td className="text-[#10b981] font-bold">{w.resolved_issues}</td>
                    <td className="text-[#ef4444] font-bold">{w.pending_issues}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-[#131f38] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#10b981] h-full"
                            style={{ width: `${rate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Master Audit Log Table */}
      <div className="card">
        <div className="card-title">
          <span>📑 Master Audit Log (All Complaints in PostgreSQL)</span>
          <span className="text-xs text-[#8899bb] font-normal">{issues.length} Records</span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Issue Title</th>
                <th>Category</th>
                <th>Ward &amp; Officer</th>
                <th>Citizen</th>
                <th>Priority Score</th>
                <th>Status</th>
                <th>AI Verification</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => {
                const urgClass =
                  i.status === 'Resolved'
                    ? 'badge-resolved'
                    : i.priority_score >= 8.5
                    ? 'badge-critical'
                    : 'badge-high';

                return (
                  <tr key={i.id || i.ticket_id}>
                    <td>
                      <strong className="text-[#14b8a6]">{i.ticket_id}</strong>
                      {i.is_duplicate && (
                        <span className="block text-[10px] text-[#a78bfa]">
                          (Duplicate of {i.master_ticket_id})
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="font-semibold text-white">{i.title}</div>
                      <div className="text-[11px] text-[#8899bb]">{i.address}</div>
                    </td>
                    <td>
                      <span className="text-xs text-[#38bdf8] font-medium">{i.category}</span>
                    </td>
                    <td>
                      <div className="text-xs text-white">{i.ward_name || `Ward ${i.ward_id}`}</div>
                      <div className="text-[11px] text-[#8899bb]">{i.assigned_officer || 'Unassigned'}</div>
                    </td>
                    <td>
                      <div className="text-xs text-white">{i.citizen_name || 'Anonymous'}</div>
                      <div className="text-[11px] text-[#8899bb]">{i.citizen_phone || '—'}</div>
                    </td>
                    <td>
                      <span className="text-[#f59e0b] font-bold">{i.priority_score}/10</span>
                      <span className="block text-[10px] text-[#8899bb]">{i.urgency_label}</span>
                    </td>
                    <td>
                      <span className={`badge ${urgClass}`}>{i.status}</span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-[#8899bb]">
                        {i.verification_status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
