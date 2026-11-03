import React, { useState } from 'react';
import GISMap from './GISMap';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

export default function CitizenPortal({ user, issues, onIssueCreated }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Roads');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('Main Bazaar Road, Near ZPHS High School');
  const [lat, setLat] = useState('16.8432');
  const [lon, setLon] = useState('80.9985');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  const { isListening, startListening } = useVoiceRecognition();

  // Voice fill for Description
  const handleVoiceDescription = () => {
    startListening((spokenText) => {
      setDescription((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
    });
  };

  // Click on Map to set coordinates
  const handleMapLocationSelect = (clickedLat, clickedLon) => {
    const formattedLat = clickedLat.toFixed(4);
    const formattedLon = clickedLon.toFixed(4);
    setLat(formattedLat);
    setLon(formattedLon);
    setAddress(`Dharmajigudem Pinpoint: ${formattedLat}, ${formattedLon}`);
  };

  // Get current device GPS coordinates
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const formattedLat = pos.coords.latitude.toFixed(4);
        const formattedLon = pos.coords.longitude.toFixed(4);
        setLat(formattedLat);
        setLon(formattedLon);
        setAddress(`GPS Device: ${formattedLat}, ${formattedLon} (Dharmajigudem)`);
      },
      (err) => {
        alert('Could not fetch GPS location. You can click directly on the map to set location.');
      }
    );
  };

  // Submit Issue to Node.js backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessBanner('');

    const formData = new FormData();
    formData.append('citizen_name', user?.full_name || 'Citizen');
    formData.append('citizen_phone', user?.phone || '+91-9848012345');
    formData.append('title', title || `${category} issue near ${address}`);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('address', address);
    formData.append('latitude', lat);
    formData.append('longitude', lon);
    formData.append('panchayat_id', '1');

    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/triage', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.status === 'SUCCESS') {
        setSuccessBanner(
          `✅ Success! Created ticket ${data.ticket.ticket_id} and routed to ${data.ticket.ward_name} (${data.ticket.assigned_officer}).`
        );
        setTitle('');
        setDescription('');
        setSelectedImage(null);
        onIssueCreated();
      } else {
        alert(data.detail || 'Failed to submit complaint.');
      }
    } catch (err) {
      alert('Could not reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Triage filler
  const handleQuickDemo = () => {
    setTitle('Dangerous Deep Pothole on School Road');
    setCategory('Roads');
    setDescription('Deep open pothole causing bike skids near Dharmajigudem High School main road.');
    setAddress('Near ZPHS High School, Main Bazaar Road, Dharmajigudem');
    setLat('16.8435');
    setLon('80.9982');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
      {/* LEFT COLUMN: Report Issue Form */}
      <div className="lg:col-span-6">
        <div className="card shadow-lg">
          <div className="card-title">
            <span className="flex items-center gap-2">
              <span>📝</span>
              <span>Report Civic Issue</span>
            </span>
            <button
              type="button"
              onClick={handleQuickDemo}
              className="text-xs text-[#14b8a6] hover:underline cursor-pointer bg-[rgba(20,184,166,0.12)] border border-[rgba(20,184,166,0.3)] px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              ⚡ Fill Demo Data
            </button>
          </div>

          {successBanner && (
            <div className="bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.4)] text-[#10b981] p-3.5 rounded-xl text-xs font-semibold mb-5 leading-relaxed">
              {successBanner}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1.5">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm py-2.5 px-3 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
              >
                <option value="Roads">🛣️ Roads (Potholes, Open Manholes, Cracks)</option>
                <option value="Garbage">🗑️ Sanitation (Garbage Piles, Overflow Waste)</option>
                <option value="Water">💧 Water Supply (Pipe Leakage, Drain Overflow)</option>
                <option value="Electrical">💡 Electrical (Broken Streetlights, Hanging Wires)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1.5">Issue Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clogged Open Drainage near Bazaar"
                className="w-full text-sm py-2.5 px-3.5 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1.5">
                Description (Voice or Text)
              </label>
              <div className="relative">
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, or click the mic to speak in Telugu or English..."
                  className="w-full pr-11 text-sm py-2.5 px-3.5 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
                ></textarea>
                <button
                  type="button"
                  title="Speak description in Telugu or English"
                  onClick={handleVoiceDescription}
                  className={`absolute right-3 top-3 text-lg cursor-pointer transition-transform hover:scale-125 ${
                    isListening ? 'text-[#ef4444] animate-pulse' : 'text-[#14b8a6]'
                  }`}
                >
                  🎙️
                </button>
              </div>
              <div className="text-[11px] text-[#8899bb] mt-1">
                Tip: Click <span className="text-[#14b8a6] font-bold">🎙️</span> to speak your issue in Telugu or English.
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-[#8899bb]">Location &amp; Address</label>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="text-xs text-[#38bdf8] hover:underline cursor-pointer font-medium"
                >
                  📍 Use Current GPS
                </button>
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm py-2.5 px-3.5 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
                required
              />
              <div className="text-[11px] text-[#8899bb] mt-1">
                Or click directly anywhere on the map to set exact coordinates.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#8899bb] mb-1">Latitude</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8899bb] mb-1">Longitude</label>
                <input
                  type="text"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="w-full text-xs py-2 px-3 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8899bb] mb-1.5">
                Defect Photo (YOLOv8 AI Detection)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedImage(e.target.files[0])}
                className="w-full text-xs py-2 px-3 bg-[#131f38] border border-[#1e2f4a] rounded-lg text-white file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0d9488] file:text-white cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-[#0d9488] to-[#059669] hover:from-[#14b8a6] hover:to-[#10b981] text-white rounded-xl font-bold text-sm transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {loading ? '🤖 Running AI Triage & Routing...' : '🚀 Run AI Triage & Route to Ward Officer'}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive GIS Map & Issues List */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        <GISMap
          issues={issues}
          selectedLocation={{ lat: parseFloat(lat), lon: parseFloat(lon) }}
          onLocationSelect={handleMapLocationSelect}
        />

        <div className="card flex-1 shadow-lg">
          <div className="card-title">
            <span>📋 My Reported Complaints</span>
            <span className="text-xs text-[#8899bb] font-normal">{issues.length} Total</span>
          </div>

          <div className="max-h-[460px] overflow-y-auto pr-1 space-y-3">
            {issues.length === 0 ? (
              <div className="text-center py-10 text-[#8899bb] text-xs">No complaints reported yet.</div>
            ) : (
              issues.map((t) => {
                const urgClass =
                  t.status === 'Resolved'
                    ? 'badge-resolved'
                    : t.priority_score >= 8.5
                    ? 'badge-critical'
                    : 'badge-high';

                return (
                  <div key={t.id || t.ticket_id} className="ticket-card">
                    <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                      <strong className="text-xs text-white">
                        {t.ticket_id} {t.ward_name ? `• ${t.ward_name}` : ''}
                      </strong>
                      <span className={`badge ${urgClass}`}>{t.status}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1">{t.title}</h4>
                    <p className="text-xs text-[#8899bb] leading-relaxed mb-2">
                      📍 {t.address} | 👤 {t.citizen_name}<br />
                      🏷 Category: <strong>{t.category}</strong> | Priority: <strong className="text-[#f59e0b]">{t.priority_score}/10</strong> ({t.urgency_label})
                    </p>
                    {t.status === 'Resolved' && (
                      <div className="text-xs text-[#10b981] font-bold bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] p-2 rounded-lg">
                        ✅ {t.verification_status || 'AI Verified: Approved'}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
