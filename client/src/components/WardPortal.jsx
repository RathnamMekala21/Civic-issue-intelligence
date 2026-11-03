import React, { useState, useEffect } from 'react';

export default function WardPortal({ user, onTaskResolved }) {
  const [selectedWardId, setSelectedWardId] = useState('all');
  const [selectedWardName, setSelectedWardName] = useState('All Wards — Consolidated View');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingTicket, setVerifyingTicket] = useState(null);

  const wardOptions = [
    { id: 'all', name: 'All Wards — Consolidated View' },
    { id: '1', name: 'Ward 1 - Central Dharmajigudem (Bazaar & ZPHS)' },
    { id: '2', name: 'Ward 2 - North Colony & Bus Stand' },
    { id: '3', name: 'Ward 3 - South Rural & Agriculture' },
  ];

  const filteredWards = wardOptions.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadWardTasks = async (wId) => {
    setLoading(true);
    try {
      const url =
        wId === 'all'
          ? 'http://127.0.0.1:8000/api/ward/tasks/all/issues'
          : `http://127.0.0.1:8000/api/ward/tasks/${wId}`;
      const res = await fetch(url);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error fetching ward tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWardTasks(selectedWardId);
  }, [selectedWardId]);

  const handleSelectWard = (w) => {
    setSelectedWardId(w.id);
    setSelectedWardName(w.name);
    setDropdownOpen(false);
    setSearchQuery('');
  };

  const handleVerifySubmit = async (e, ticketId) => {
    e.preventDefault();
    const fileInput = e.target.elements[`photo_${ticketId}`];
    if (!fileInput || !fileInput.files[0]) {
      alert('Please select a repair completion photo.');
      return;
    }

    setVerifyingTicket(ticketId);
    const formData = new FormData();
    formData.append('ticket_id', ticketId);
    formData.append('completion_image', fileInput.files[0]);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/ward/verify-resolution', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'SUCCESS') {
        alert(`✅ AI SSIM Verification APPROVED!\n\nMatch Score: ${data.verification.score_percentage}\n\nTicket status updated to RESOLVED in PostgreSQL.`);
        loadWardTasks(selectedWardId);
        onTaskResolved();
      } else {
        alert(`❌ AI Verification REJECTED\n\nMatch Score: ${data.verification?.score_percentage || 'Below threshold'}\nRequired: 80%+\n\nPhoto does not show adequate visual repair.`);
      }
    } catch (err) {
      alert('Verification request failed. Check server connection.');
    } finally {
      setVerifyingTicket(null);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3 border-b border-[#1e2f4a] pb-3">
        <div>
          <h2 className="text-lg font-bold text-[#14b8a6]">👷 Ward Sachivalayam Tasks</h2>
          <p className="text-xs text-[#8899bb]">Assigned civic field tasks, SLA timers, and AI photo closure</p>
        </div>

        {/* Searchable Ward Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-[#131f38] border border-[#1e2f4a] hover:border-[#14b8a6] px-3.5 py-2 rounded-lg text-xs font-semibold text-white flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>🏷️ {selectedWardName}</span>
            <span className="text-[10px]">▼</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-[#0e172a] border border-[#14b8a6] rounded-xl shadow-2xl z-50 p-2">
              <input
                type="text"
                placeholder="Type to search ward..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs p-2 mb-2 bg-[#131f38] rounded-lg"
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto">
                {filteredWards.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => handleSelectWard(w)}
                    className={`p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      selectedWardId === w.id
                        ? 'bg-[rgba(20,184,166,0.15)] text-[#14b8a6] font-bold'
                        : 'text-[#8899bb] hover:bg-[#131f38] hover:text-white'
                    }`}
                  >
                    {w.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-[#8899bb] mb-4">
        Showing <strong>{tasks.length}</strong> tasks for: <span className="text-[#f59e0b] font-semibold">{selectedWardName}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#14b8a6] text-xs py-8 justify-center">
          <div className="spinner"></div> Loading ward tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-[#8899bb]">
          <div className="text-3xl mb-2">✅</div>
          <div className="font-semibold text-sm">No issues found for this ward.</div>
          <div className="text-xs mt-1">All clean — or select another ward to view tasks.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((t) => {
            const urgClass =
              t.status === 'Resolved'
                ? 'badge-resolved'
                : t.priority_score >= 8.5
                ? 'badge-critical'
                : 'badge-high';

            return (
              <div key={t.ticket_id} className="ticket-card">
                <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                  <strong className="text-xs text-white">
                    {t.ticket_id} {t.ward_name ? `• ${t.ward_name}` : ''}
                  </strong>
                  <span className={`badge ${urgClass}`}>{t.status}</span>
                </div>

                <h4 className="text-sm font-semibold text-white mb-1.5">{t.title}</h4>

                <p className="text-xs text-[#8899bb] leading-relaxed mb-3">
                  📍 {t.address} | 👤 {t.citizen_name} | 📞 {t.citizen_phone || '—'}<br />
                  🏷 Category: <strong>{t.category}</strong> | Priority: <strong className="text-[#f59e0b]">{t.priority_score}/10</strong> ({t.urgency_label})
                </p>

                {t.voice_audio_url && (
                  <div className="mb-3 bg-[#070d1c] p-2 rounded-lg border border-[#1e2f4a]">
                    <div className="text-[11px] text-[#14b8a6] mb-1 font-semibold">🎙️ Citizen Voice Recording:</div>
                    <audio controls src={`http://127.0.0.1:8000${t.voice_audio_url}`} className="w-full h-7"></audio>
                  </div>
                )}

                {t.status === 'Resolved' ? (
                  <div className="text-xs text-[#10b981] font-bold bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] p-2 rounded-lg">
                    ✅ {t.verification_status || 'AI Verified: Approved'}
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => handleVerifySubmit(e, t.ticket_id)}
                    className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#1e2f4a]"
                  >
                    <input
                      type="file"
                      name={`photo_${t.ticket_id}`}
                      accept="image/*"
                      required
                      className="text-xs flex-1 min-w-[150px] p-1.5"
                    />
                    <button
                      type="submit"
                      disabled={verifyingTicket === t.ticket_id}
                      className="bg-[#0d9488] hover:bg-[#14b8a6] text-white px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {verifyingTicket === t.ticket_id
                        ? 'Analyzing (SSIM)...'
                        : '📸 Upload & AI Verify (SSIM)'}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
