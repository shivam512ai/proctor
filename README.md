# ProctorGuard AI — Anti-Cheat Proctoring Web Application

A full-stack, automated online exam proctoring and anti-cheat web application built with **React** (frontend) and **FastAPI** (backend), powered by a multi-modal computer vision and AI pipeline integrating **YOLOv8**, **Google MediaPipe**, and **DeepFace**.

---

## 🌟 Key Features

### 1. Multi-Modal Vision & AI Detection Pipeline
- **YOLOv8 (`ultralytics`)**:
  - **Prohibited Devices Radar**: Detects unauthorized mobile phones (`cell phone`), books/notes (`book`), secondary computers/monitors (`laptop`), and remote controls in real-time.
  - **Multi-Person Detection**: Alerts when secondary test-takers or proxies step into frame (`person` count > 1).
  - **Candidate Absence**: Immediately flags when the candidate leaves the camera view (`person` count = 0).
- **Google MediaPipe (`mediapipe.tasks.python.vision.FaceLandmarker`)**:
  - **Head Pose Estimation**: High-precision 3D Euler angles (**Yaw**, **Pitch**, **Roll**) to detect looking away (left/right) or looking down towards a desk, hidden cheat notes, or a lap-held phone.
  - **Gaze & Eye Tracking**: Blendshape scores track pupil deviation off-screen.
  - **Mouth Motion & Whispering**: Detects jaw opening / candidate talking to someone off-camera.
  - **Facial Mesh Overlay**: Real-time 468-point visual landmark contours rendered onto the candidate HUD.
- **DeepFace (`deepface` Facenet)**:
  - **Candidate Enrollment**: Captures a reference baseline photo during onboarding and extracts a 128-dimensional facial biometric embedding.
  - **Continuous Identity Verification**: Periodically verifies the live exam stream against the baseline photo to prevent proxy test-takers or person substitutions.

### 2. Client-Side Browser Lock-Down & System Integrity
- **Fullscreen Enforcement**: Locks the candidate into fullscreen mode with an instant blur lock screen if exited.
- **Tab Switch & Window Blur Detection**: Listens to `visibilitychange` and window `blur` events; triggers audio warnings and logs infractions if candidate minimizes the window or changes tabs.
- **Prohibited Shortcut Interception**: Blocks `Ctrl+C`, `Ctrl+V`, `Ctrl+X`, `F12`, and DevTools key combinations.
- **Context Menu Disabled**: Prevents right-click inspect or copying.
- **Microphone Audio Meter**: Web Audio API monitors ambient audio levels and speech activity.

### 3. Dynamic Trust Score & Proctoring Audit Reports
- **Integrity Trust Score**: Starts at 100% and dynamically penalizes infractions based on severity:
  - `CRITICAL` (-18 pts): Cell phone, Imposter/Face mismatch, Multiple persons, Absent.
  - `WARNING` (-7 pts): Gaze deviation, Looking down, Tab switch, Fullscreen exit.
  - `INFO` (-3 pts): Speaking / mouth movement, Key violation.
- **Proctor Auditor Dashboard**:
  - Summary verdict: `CLEAN` (Trust ≥ 80%), `SUSPICIOUS` (60–79%), or `FLAGGED` (< 60% or multiple critical breaches).
  - Candidate identity comparison card (Enrolled Photo vs Live Detection Snapshot).
  - Breakdown by detector category.
  - Chronological incident timeline with timestamped photographic evidence snapshots.
  - Export audit report as JSON.

---

## 🏗️ Architecture

```
proctor/
├── backend/
│   ├── main.py              # FastAPI app, REST endpoints, WebSocket streaming
│   ├── detector.py          # Unified AntiCheatDetector (YOLO, MediaPipe, DeepFace)
│   ├── session_manager.py   # State, trust score calculator, and incident logging
│   └── models.py            # Pydantic data schemas
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── OnboardingModal.jsx   # Candidate verification & ID photo enrollment
│   │   │   ├── ProctorHUD.jsx        # Live webcam feed, canvas HUD & telemetry
│   │   │   ├── ExamInterface.jsx     # Realistic interactive exam platform
│   │   │   ├── ProctorDashboard.jsx  # Auditor report, verdict & evidence timeline
│   │   │   └── AlertBanner.jsx       # Floating real-time toast alerts
│   │   ├── data/mockQuestions.js     # Realistic examination questions
│   │   ├── utils/soundEffects.js     # Web Audio API warning sound synthesizer
│   │   ├── App.jsx                   # Main application layout & state machine
│   │   └── index.css                 # Tailwind CSS styling
│   └── package.json
├── start_backend.py         # Dedicated backend runner script
├── start_servers.py         # Single runner launching both backend and frontend
└── yolov8n.pt               # YOLOv8 pre-trained model weights
```

---

## 🚀 Running the Application

### Option A: Launch Everything with One Command
```bash
python start_servers.py
```
This automatically starts:
- **Backend**: `http://localhost:8000`
- **Frontend**: `http://localhost:5173`

### Option B: Run Services Independently

1. **Start the FastAPI Backend**:
   ```bash
   python start_backend.py
   ```
   Backend will be active at `http://localhost:8000`. You can inspect interactive API documentation at `http://localhost:8000/docs`.

2. **Start the React Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🧪 Testing the Anti-Cheat Features

1. **Candidate Onboarding**:
   - Open `http://localhost:5173`.
   - Enter your name and candidate ID.
   - Position your face in the oval and click **Capture Reference Photo** (enrolls your face in DeepFace).
   - Click **Agree & Enter Proctored Exam**.

2. **Triggering Cheating Detections in Real-Time**:
   - **Cell Phone Detection**: Hold your phone in front of the webcam. Notice the immediate red bounding box labeled `🚨 CELL PHONE`, the alert chime, the toast banner, and the trust score decrement!
   - **Gaze / Looking Away**: Turn your head left, right, or down towards your desk. The MediaPipe head pose detector flags `Looking Left` / `Looking Down`.
   - **Absence**: Step out of frame. The engine immediately reports `No person detected in camera view`.
   - **Secondary Person**: Have a friend step into frame. The engine detects `Multiple persons detected`.
   - **Tab Switching**: Switch to another browser tab or minimize the browser window. When you switch back, an alert modal warns you of tab violation logging.
   - **Fullscreen**: Exit fullscreen (Esc) to see the instant exam lockdown screen.

3. **Submitting & Proctor Audit Report**:
   - Answer the exam questions and click **Finish & Submit** (or toggle the **Auditor Live HUD** in the header).
   - Review your **Automated Proctoring Assessment**, biometric comparison, category breakdown, and timestamped infraction timeline with photographic evidence!
