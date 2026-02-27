# 🎮 InSuite Typers
### India's Smartest Live Typing Competition & Institute Management Platform

InSuite Typers is a professional-grade typing competition platform designed for institutes to manage students, host live competitions, and track performance with advanced analytics.

---

## 🚀 Key Features

### 👤 Student Features
- **Live Playground:** Real-time typing competitions with live rankings and synchronization.
- **Session Persistence:** 1-hour active sessions that persist across page reloads.
- **Achievements System:** Earn badges based on speed, accuracy, and consistency.
- **Responsive Interface:** Fully optimized for mobile and desktop with horizontal scrollable data tables.

### 🛡️ Administrative Controls
- **Advanced Student Management:**
  - Assign student IDs and batches.
  - Temporarily disable/suspend accounts with custom reason notes.
  - Inline editing of student profiles.
- **Live Playground Control:**
  - Real-time monitoring of active students.
  - Manual score adjustments and participant freezing.
  - Leaderboard display controls (Freeze/Unfreeze).
  - Bulk student selection via batch management.
- **Detailed Analytics:**
  - **Session Logs:** Monitor login times, locations (IP-based), and device information.
  - **Device Breakdown:** Insights into user OS, browsers, and device types.
  - **Performance Leaderboards:** Track WPM, accuracy, and total competitions per student.
- **Branding & Customization:** Branded landing page with animated statistics and institute-specific messaging.

---

## 🛠️ Technology Stack
- **Frontend:** React, Vite, Vanilla CSS (Premium Glassmorphism).
- **Backend:** Firebase (Firestore, Authentication).
- **Icons:** React Icons (Feather).
- **Geolocation:** ipapi for login tracking.

---

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Vinkal93/ztypers.git
   cd ztypers
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase:**
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

---

## 📄 License
This project is proprietary and built for **InSuite Institute**. Unauthorized copying or distribution is strictly prohibited.

---
*Built with ❤️ by the InSuite Team*
