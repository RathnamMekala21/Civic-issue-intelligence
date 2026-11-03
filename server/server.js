const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const {
  detectDefect,
  checkDuplicate,
  verifyResolution,
  routeToPanchayatWard,
  calculatePriorityScore,
} = require('./aiService');

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS for React frontend (Vite runs on 5173, etc.)
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup file uploads
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const VOICE_DIR = path.join(UPLOAD_DIR, 'voice');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(VOICE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'voice_audio') {
      cb(null, VOICE_DIR);
    } else {
      cb(null, UPLOAD_DIR);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const prefix = file.fieldname === 'voice_audio' ? 'voice_' : 'issue_';
    cb(null, `${prefix}${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// Serve static uploads
app.use('/uploads', express.static(UPLOAD_DIR));

// ----------------------------------------------------
// 1. AUTHENTICATION (LOGIN & REGISTRATION)
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ detail: 'Identifier and password are required.' });
    }

    const cleanId = identifier.trim();
    const cleanPw = password.trim();

    const userRes = await db.query(
      'SELECT * FROM users WHERE phone = $1 OR email = $1 LIMIT 1',
      [cleanId]
    );

    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({ detail: 'User not found with this mobile or email.' });
    }

    // Demo password check (plaintext match or hashed)
    if (user.password_hash !== cleanPw && user.password_hash !== 'demo1234') {
      return res.status(401).json({ detail: 'Invalid password. Please try again.' });
    }

    let wardName = 'All Wards';
    if (user.ward_id) {
      const wardRes = await db.query('SELECT ward_name FROM wards WHERE id = $1', [user.ward_id]);
      if (wardRes.rows[0]) wardName = wardRes.rows[0].ward_name;
    }

    return res.json({
      status: 'SUCCESS',
      message: `Welcome back, ${user.full_name}!`,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        email: user.email,
        phone: user.phone,
        panchayat_id: user.panchayat_id,
        ward_id: user.ward_id,
        ward_name: wardName,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ detail: 'Internal server error during login.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, phone, password, panchayat_id } = req.body;

    if (!full_name || !phone || !password) {
      return res.status(400).json({ detail: 'Full name, phone, and password are required.' });
    }

    const existingRes = await db.query('SELECT id FROM users WHERE phone = $1 LIMIT 1', [phone.trim()]);
    if (existingRes.rows.length > 0) {
      return res.status(400).json({ detail: 'This phone number is already registered. Please login.' });
    }

    const pId = parseInt(panchayat_id || '1', 10);
    const insertRes = await db.query(
      `INSERT INTO users (full_name, phone, password_hash, role, panchayat_id, created_at)
       VALUES ($1, $2, $3, 'citizen', $4, NOW())
       RETURNING *`,
      [full_name.trim(), phone.trim(), password.trim(), pId]
    );

    const newUser = insertRes.rows[0];

    // Ensure users_id_seq stays synchronized
    await db.query("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users))");

    return res.json({
      status: 'SUCCESS',
      message: `Welcome ${newUser.full_name}! Your citizen account has been created.`,
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        role: 'citizen',
        phone: newUser.phone,
        panchayat_id: pId,
        ward_id: null,
        ward_name: 'All Wards',
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ detail: 'Internal server error during registration.' });
  }
});

// ----------------------------------------------------
// 2. CITIZEN ISSUE SUBMISSION & AI TRIAGE
// ----------------------------------------------------
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'voice_audio', maxCount: 1 },
]);

const handleIssueTriage = async (req, res) => {
  try {
    const citizen_name = req.body.citizen_name || 'Guest Citizen';
    const citizen_phone = req.body.citizen_phone || '+91-9848012345';
    const address = req.body.address || 'Dharmajigudem Village, Main Road';
    const latitude = parseFloat(req.body.latitude || '16.8432');
    const longitude = parseFloat(req.body.longitude || '80.9985');
    const description = (req.body.description || '').trim();
    const panchayat_id = parseInt(req.body.panchayat_id || '1', 10);

    let photoUrl = null;
    let savedPhotoPath = '';
    if (req.files && req.files['image'] && req.files['image'][0]) {
      const f = req.files['image'][0];
      savedPhotoPath = f.path;
      photoUrl = `/uploads/${path.basename(f.path)}`;
    }

    let voiceUrl = null;
    if (req.files && req.files['voice_audio'] && req.files['voice_audio'][0]) {
      const v = req.files['voice_audio'][0];
      voiceUrl = `/uploads/voice/${path.basename(v.path)}`;
    }

    let finalDesc = description;
    if (!finalDesc && voiceUrl) {
      finalDesc = 'Voice complaint recorded by citizen (Audio attached).';
    }

    // 1. AI Defect Detection (YOLOv8 + NLP intent)
    const aiResult = await detectDefect(savedPhotoPath, finalDesc);
    const category = aiResult.category || 'Roads';
    const severity = aiResult.severity_score || 0.8;

    // 2. Check 50m Spatial Duplicate in PostgreSQL (DBSCAN)
    const activeRes = await db.query(
      "SELECT id, ticket_id, master_ticket_id, latitude, longitude, category, status, citizen_name, title " +
      "FROM issues WHERE status IN ('Submitted', 'Assigned', 'In Progress')"
    );
    const activeIssues = activeRes.rows;

    const dupInfo = await checkDuplicate(latitude, longitude, category, activeIssues);
    const isDuplicate = dupInfo !== null;

    // Generate sequential ticket ID: CIV-DGM-08, CIV-DGM-09 ...
    const countRes = await db.query('SELECT COUNT(*) AS cnt FROM issues');
    const totalCount = parseInt(countRes.rows[0].cnt, 10);
    const ticketNum = totalCount + 1;
    const ticketId = `CIV-DGM-${String(ticketNum).padStart(2, '0')}`;
    const masterTicketId = isDuplicate ? dupInfo.master_ticket_id : ticketId;

    // 3. Panchayat Ward GIS Routing (Haversine)
    const routingInfo = await routeToPanchayatWard(latitude, longitude, category, panchayat_id, db);

    // 4. Calculate Dynamic Priority Score & SLA
    const priorityInfo = calculatePriorityScore(severity, category, isDuplicate);

    // 5. Insert into PostgreSQL issues table
    const titleText = `${aiResult.detected_label || category} at ${address}`;
    const insertSql = `
      INSERT INTO issues (
        ticket_id, master_ticket_id, title, category, description,
        voice_audio_url, original_photo_url, latitude, longitude, address,
        priority_score, urgency_label, status, is_duplicate, duplicate_count,
        citizen_name, citizen_phone, ward_id, ward_name, panchayat_id,
        assigned_officer_id, assigned_officer_name, officer_email, officer_phone,
        verification_status, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, 'Submitted', $13, $14,
        $15, $16, $17, $18, $19,
        $20, $21, $22, $23,
        'Pending', NOW()
      ) RETURNING *
    `;

    const values = [
      ticketId,
      masterTicketId,
      titleText,
      category,
      finalDesc,
      voiceUrl,
      photoUrl || '/uploads/sample_pothole.jpg',
      latitude,
      longitude,
      address,
      priorityInfo.priority_score,
      priorityInfo.urgency_label,
      isDuplicate,
      isDuplicate ? 1 : 0,
      citizen_name,
      citizen_phone,
      routingInfo.ward_id,
      routingInfo.ward_name,
      panchayat_id,
      routingInfo.assigned_officer_id,
      routingInfo.assigned_officer_name,
      routingInfo.officer_email,
      routingInfo.officer_phone,
    ];

    const result = await db.query(insertSql, values);
    const newIssue = result.rows[0];

    // Ensure sequences stay synced
    await db.query("SELECT setval('issues_id_seq', (SELECT COALESCE(MAX(id), 1) FROM issues))");

    return res.json({
      status: 'SUCCESS',
      message: 'Issue recorded into PostgreSQL database successfully.',
      ticket: {
        ticket_id: newIssue.ticket_id,
        master_ticket_id: newIssue.master_ticket_id,
        title: newIssue.title,
        category: newIssue.category,
        ward_id: newIssue.ward_id,
        ward_name: newIssue.ward_name,
        assigned_officer: newIssue.assigned_officer_name,
        officer_phone: newIssue.officer_phone,
        priority_score: newIssue.priority_score,
        urgency_label: newIssue.urgency_label,
        is_duplicate: newIssue.is_duplicate,
        voice_url: newIssue.voice_audio_url,
        photo_url: newIssue.original_photo_url,
        status: newIssue.status,
      },
    });
  } catch (err) {
    console.error('Triage error:', err);
    return res.status(500).json({ detail: 'Internal error recording issue.' });
  }
};

app.post('/api/triage', uploadFields, handleIssueTriage);
app.post('/api/submit-issue', uploadFields, handleIssueTriage);

// ----------------------------------------------------
// 3. GET ALL ISSUES (ADMIN / SECRETARY VIEW)
// ----------------------------------------------------
app.get('/api/issues', async (req, res) => {
  try {
    const issuesRes = await db.query('SELECT * FROM issues ORDER BY id DESC');
    return res.json({
      issues: issuesRes.rows.map((i) => ({
        id: i.id,
        ticket_id: i.ticket_id,
        master_ticket_id: i.master_ticket_id,
        title: i.title,
        category: i.category,
        description: i.description,
        address: i.address,
        ward_id: i.ward_id,
        ward_name: i.ward_name,
        priority_score: i.priority_score,
        urgency_label: i.urgency_label,
        status: i.status,
        citizen_name: i.citizen_name,
        citizen_phone: i.citizen_phone,
        assigned_officer: i.assigned_officer_name,
        original_photo: i.original_photo_url,
        completion_photo: i.completion_photo_url,
        voice_audio_url: i.voice_audio_url,
        verification_status: i.verification_status,
        created_at: String(i.created_at),
      })),
    });
  } catch (err) {
    console.error('Fetch issues error:', err);
    return res.status(500).json({ detail: 'Failed to fetch issues.' });
  }
});

// ----------------------------------------------------
// 4. WARD-SPECIFIC TASKS (OFFICER VIEW)
// ----------------------------------------------------
app.get('/api/ward/tasks/all/issues', async (req, res) => {
  try {
    const tasksRes = await db.query('SELECT * FROM issues ORDER BY id DESC');
    return res.json({
      ward_id: 'all',
      total: tasksRes.rows.length,
      tasks: tasksRes.rows.map((t) => ({
        ticket_id: t.ticket_id,
        title: t.title,
        category: t.category,
        address: t.address,
        ward_name: t.ward_name,
        priority_score: t.priority_score,
        urgency_label: t.urgency_label,
        status: t.status,
        citizen_name: t.citizen_name,
        citizen_phone: t.citizen_phone,
        original_photo: t.original_photo_url,
        completion_photo: t.completion_photo_url,
        voice_audio_url: t.voice_audio_url,
        verification_status: t.verification_status,
        created_at: String(t.created_at),
      })),
    });
  } catch (err) {
    console.error('All ward tasks error:', err);
    return res.status(500).json({ detail: 'Failed to fetch all ward tasks.' });
  }
});

app.get('/api/ward/tasks/:ward_id', async (req, res) => {
  try {
    const wardId = parseInt(req.params.ward_id, 10);
    const tasksRes = await db.query('SELECT * FROM issues WHERE ward_id = $1 ORDER BY id DESC', [wardId]);
    return res.json({
      ward_id: wardId,
      total: tasksRes.rows.length,
      tasks: tasksRes.rows.map((t) => ({
        ticket_id: t.ticket_id,
        title: t.title,
        category: t.category,
        address: t.address,
        priority_score: t.priority_score,
        urgency_label: t.urgency_label,
        status: t.status,
        citizen_name: t.citizen_name,
        citizen_phone: t.citizen_phone,
        original_photo: t.original_photo_url,
        completion_photo: t.completion_photo_url,
        voice_audio_url: t.voice_audio_url,
        verification_status: t.verification_status,
        created_at: String(t.created_at),
      })),
    });
  } catch (err) {
    console.error('Ward tasks error:', err);
    return res.status(500).json({ detail: 'Failed to fetch ward tasks.' });
  }
});

// ----------------------------------------------------
// 5. OFFICER AI REPAIR VERIFICATION (SSIM)
// ----------------------------------------------------
app.post('/api/ward/verify-resolution', upload.single('completion_image'), async (req, res) => {
  try {
    const { ticket_id } = req.body;
    if (!ticket_id) {
      return res.status(400).json({ detail: 'Ticket ID is required.' });
    }

    const issueRes = await db.query('SELECT * FROM issues WHERE ticket_id = $1 LIMIT 1', [ticket_id]);
    const issue = issueRes.rows[0];
    if (!issue) {
      return res.status(404).json({ detail: 'Ticket ID not found in database.' });
    }

    if (!req.file) {
      return res.status(400).json({ detail: 'Completion image is required.' });
    }

    const savedPath = req.file.path;
    const completionUrl = `/uploads/${path.basename(savedPath)}`;

    const origUrl = issue.original_photo_url || '';
    const origFilename = origUrl ? path.basename(origUrl) : '';
    const origPath = path.join(UPLOAD_DIR, origFilename);

    const verifResult = await verifyResolution(origPath, savedPath);

    if (verifResult.verified) {
      const updateSql = `
        UPDATE issues 
        SET status = 'Resolved',
            completion_photo_url = $1,
            verification_score = $2,
            verification_status = $3,
            resolved_at = NOW()
        WHERE ticket_id = $4
        RETURNING status
      `;
      const upRes = await db.query(updateSql, [
        completionUrl,
        verifResult.score,
        `Approved (${verifResult.score_percentage} match)`,
        ticket_id,
      ]);
      return res.json({
        status: 'SUCCESS',
        verification: verifResult,
        ticket_status: upRes.rows[0].status,
      });
    } else {
      const updateSql = `
        UPDATE issues 
        SET status = 'Closure Rejected (AI SSIM Failure)',
            completion_photo_url = $1,
            verification_score = $2,
            verification_status = $3
        WHERE ticket_id = $4
        RETURNING status
      `;
      const upRes = await db.query(updateSql, [
        completionUrl,
        verifResult.score,
        `Rejected: ${verifResult.score_percentage} (Below 80% threshold)`,
        ticket_id,
      ]);
      return res.json({
        status: 'REJECTED',
        verification: verifResult,
        ticket_status: upRes.rows[0].status,
      });
    }
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ detail: 'Internal error verifying repair.' });
  }
});

// ----------------------------------------------------
// 6. PANCHAYAT STATS & WARDS METADATA
// ----------------------------------------------------
app.get('/api/panchayats', async (req, res) => {
  try {
    const pRes = await db.query('SELECT * FROM panchayats');
    const wRes = await db.query('SELECT * FROM wards ORDER BY ward_number ASC');
    return res.json({
      panchayats: pRes.rows.map((p) => ({
        id: p.id,
        name: p.name,
        mandal: p.mandal,
        district: p.district,
      })),
      wards: wRes.rows.map((w) => ({
        id: w.id,
        ward_number: w.ward_number,
        ward_name: w.ward_name,
        member: w.ward_member_name,
      })),
    });
  } catch (err) {
    console.error('Panchayats error:', err);
    return res.status(500).json({ detail: 'Failed to fetch panchayats.' });
  }
});

const handleGetStats = async (req, res) => {
  try {
    const issuesRes = await db.query('SELECT * FROM issues');
    const issues = issuesRes.rows;
    const total = issues.length;
    const resolved = issues.filter((i) => i.status === 'Resolved').length;
    const duplicates = issues.filter((i) => i.is_duplicate).length;
    const critical = issues.filter((i) => (i.urgency_label || '').includes('CRITICAL')).length;

    const wardsRes = await db.query('SELECT * FROM wards ORDER BY ward_number ASC');
    const wards = wardsRes.rows;

    const wardStats = wards.map((w) => {
      const wIssues = issues.filter((i) => i.ward_id === w.id);
      const wTotal = wIssues.length;
      const wResolved = wIssues.filter((i) => i.status === 'Resolved').length;
      return {
        ward_id: w.id,
        ward_name: w.ward_name,
        ward_member: w.ward_member_name,
        total_issues: wTotal,
        resolved_issues: wResolved,
        pending_issues: wTotal - wResolved,
      };
    });

    const pRes = await db.query('SELECT * FROM panchayats WHERE id = 1 LIMIT 1');
    const panchayat = pRes.rows[0];

    return res.json({
      panchayat_name: panchayat ? panchayat.name : 'Dharmajigudem Gram Panchayat',
      mandal: panchayat ? panchayat.mandal : 'Lingapalem',
      district: panchayat ? panchayat.district : 'West Godavari',
      total_issues: total,
      resolved_issues: resolved,
      pending_issues: total - resolved,
      duplicates_suppressed: duplicates,
      critical_issues: critical,
      sla_compliance_rate: total > 0 ? `${((resolved / total) * 100).toFixed(1)}%` : '100%',
      ward_breakdown: wardStats,
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ detail: 'Failed to calculate stats.' });
  }
};

app.get('/api/stats', handleGetStats);
app.get('/api/admin/panchayat-stats', handleGetStats);

// Serve React production build if available (SPA Fallback)
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    }
    next();
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Node.js Express Server running on http://127.0.0.1:${PORT}`);
});
