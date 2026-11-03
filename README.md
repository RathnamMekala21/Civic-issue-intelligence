# 🏛️ Civic Issue Intelligence & Automated Resolution Platform
> **Pilot Implementation:** Dharmajigudem Gram Panchayat • Lingapalem Mandal, West Godavari District

An AI-driven, multi-modal civic grievance management platform designed to automate defect identification, suppress duplicate complaints, intelligently route tasks to local ward sachivalayam officers, and computationally verify field repairs.

---

## 🌟 Key Features

* **AI Defect Detection (YOLOv8):** Real-time computer vision detection for potholes, garbage accumulation, water/drainage leakages, and broken streetlights.
* **Spatial Deduplication (DBSCAN Clustering):** 50-meter density-based spatial clustering to merge duplicate reports under a single Master Ticket (`CIV-DGM-xx`).
* **GIS Haversine Spatial Routing:** Automatically maps complaint GPS coordinates to the nearest Ward centroid (Ward 1, 2, or 3) and designates the responsible Ward Sachivalayam Officer.
* **AI Repair Verification (OpenCV SSIM):** Compares Before-and-After photos using the Structural Similarity Index Measure (SSIM) requiring an 80%+ transformation score before closing tasks.
* **Voice-to-Text Dictation:** Native browser Web Speech API integration allowing citizens to dictate complaints in Telugu or English.
* **Interactive GIS Map:** Leaflet.js mapping with click-to-pin coordinate selection and color-coded priority markers.
* **Role-Based Portals:** Separate, private dashboards for **Citizens**, **Ward Sachivalayam Officers**, and **Panchayat Secretaries**.

---

## 🏗️ System Architecture

* **Frontend:** React.js (Vite) + Tailwind CSS + Leaflet.js + Web Speech API
* **Backend API Gateway:** Node.js + Express.js (REST API, Role Auth, Multer Uploads)
* **AI Intelligence Engine:** Python 3.12 (Ultralytics YOLOv8, Scikit-Learn DBSCAN, OpenCV SSIM)
* **Database Layer:** PostgreSQL 17 (`civic_panchayat_db`) with relational ACID integrity and connection pooling

```
[React.js Frontend]  (Port 8000 / 5173)
       │
       ▼  HTTP REST API
[Node.js / Express.js Gateway]
       ├── Python AI Subprocess Bridge (YOLOv8 + DBSCAN + SSIM)
       └── PostgreSQL 17 Database (`civic_panchayat_db`)
```

---

## 📁 Project Structure

```
Civic Issue Intelligence/
├── client/             # React.js Frontend (Vite + Tailwind CSS + Leaflet)
│   ├── src/
│   │   ├── components/ # CitizenPortal, WardPortal, SecretaryDashboard, AuthModal, GISMap, StatsGrid
│   │   ├── hooks/      # useVoiceRecognition (Web Speech API)
│   │   └── App.jsx
│   └── package.json
│
├── server/             # Node.js + Express.js Backend API
│   ├── server.js       # Main API Gateway & static asset server
│   ├── db.js           # PostgreSQL connection pool
│   ├── aiService.js    # Node.js AI coordinator & GIS routing
│   ├── ai_bridge.py    # Python subprocess bridge to AI engine
│   └── package.json
│
├── ai_engine/          # Python Deep Learning & Computer Vision Models
│   ├── yolo_detector.py      # YOLOv8 defect detection
│   ├── spatial_clustering.py # DBSCAN 50m spatial duplicate clustering
│   └── ssim_verifier.py      # OpenCV SSIM verification
│
├── uploads/            # Media storage for defect images & voice audio
├── package.json        # Root script manager
└── requirements.txt    # Python dependencies
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js:** v18+ or v20+ installed
* **Python:** 3.10+ or 3.12+ installed
* **PostgreSQL:** 15+ or 17+ running on port `5432` with database `civic_panchayat_db`

### 2. Install Dependencies

```powershell
# Install Node.js backend dependencies
cd server
npm install
cd ..

# Install React frontend dependencies
cd client
npm install
npm run build
cd ..

# Install Python AI dependencies
pip install -r requirements.txt
```

### 3. Run the Application

From the root directory:

```powershell
npm start
```

Access the application in your browser:
👉 **`http://127.0.0.1:8000`**

---

## 🔐 Demo Credentials

| Role | Username / Email | Password | Access Level |
|---|---|---|---|
| **Citizen** | `9848012345` | `1234` | Citizen Intake & Complaint Tracking |
| **Ward Officer** | `ward1@dgm.gov.in` | `ward123` | Ward Task Board & SSIM AI Closure |
| **Secretary** | `secretary@dgm.gov.in` | `admin123` | Municipal Audit Log & SLA Oversight |

---

## 📄 License
This project is developed for educational and municipal grievance management demonstration purposes.
