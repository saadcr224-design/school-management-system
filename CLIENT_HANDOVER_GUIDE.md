# Shezad Children Academy - School Management System
## Client Handover & Deployment Guide

Welcome to the **Shezad Children Academy Management System**, a modern, high-performance, full-featured web application engineered specifically for educational institutions and multi-campus networks.

---

## 🔐 Administrative Login Credentials

The application opens directly to the **Sign In** screen.

- **Email / Username**: `admin`
- **Password**: `admin123`

*Session authentication is automatically persisted in the browser. You can click **Sign out** at the bottom of the sidebar at any time to return to the login screen.*

---

## 💻 How to Install as a Desktop App on Your PC

Shezad Children Academy is built as a **Progressive Web App (PWA)**, which means you can install it directly onto Windows PC as a standalone desktop application with its own desktop icon, start menu shortcut, and window frame (without browser address bars).

### Method 1: Using the in-app Install Button
1. Open the application in Google Chrome or Microsoft Edge.
2. Click the **"💻 Install App on PC"** button located on the **Sign In** screen or at the bottom of the **Sidebar**.
3. A popup will ask: *"Install app?"* -> Click **Install**.
4. A desktop shortcut will be placed on your desktop and the app will open in its own clean window!

### Method 2: From the Browser Address Bar
1. Look at the right side of your browser's address bar (URL bar).
2. Click the **Install Shezad Children Academy** icon (computer screen with a down arrow).
3. Click **Install**.

---

## 🌟 Key Application Features

1. **Dashboard & Executive Analytics**
   - 8 live KPI metric cards (Active Students, New Admissions, Fee Collected, Outstanding Fees, Staff Members, Salary Expense, Active Campuses, Net Income).
   - Dynamic *Student Enrollment by Campus* bar chart.
   - Real-time *Fee Status Distribution* chart (Paid vs Unpaid vs Partial).
   - Urgent pending fee recovery table.

2. **Students Directory & ID Cards**
   - Search by name, roll number, or phone.
   - Filter by Campus and Class/Grade.
   - Interactive **Shezad Children Academy Student Identity Card** modal with instant browser printing.
   - Full student profile editing and record archiving.

3. **Fee Slips & Official 3-Copy Bank Challan**
   - Generate single or batch fee vouchers.
   - Real-time billing status (*Paid*, *Unpaid*, *Partial*).
   - **Official 3-Part Printable Bank Challan**:
     - Bank Copy
     - School Copy
     - Student Copy
     - Perforated cutlines, tuition breakdown, late fine notice, and bank/cashier stamp boxes.
   - Fee collection counter that automatically updates arrears and posts to the General Ledger.

4. **Staff & Payroll Management**
   - Faculty roster with designation, assigned campus, and basic pay.
   - Monthly salary disbursal with allowances and deductions calculation.
   - Automatic debit posting to the General Ledger under *Salary Expense*.

5. **Daily Attendance System**
   - Dual-mode: Student Daily Attendance and Faculty Attendance.
   - Date picker, campus selector, and class selector.
   - 1-Click *Mark All Present* shortcut.
   - Real-time attendance percentage metrics.

6. **School Financial Ledger**
   - General double-entry accounting ledger.
   - Tracks cash inflows (Fee collections, Admissions) and outflows (Salaries, Rent, Utilities, Maintenance).
   - Live treasury net cash balance calculation.
   - Post manual transaction vouchers.
   - **Export to CSV**: Instant 1-click download of the complete financial ledger for Excel/Auditing.

7. **Audit Reports & Defaulters List**
   - Overdue Fee Defaulters audit report with student contact numbers.
   - Campus-wise financial & enrollment comparison across all 10 branches.
   - Printable official summary report.

8. **User Management & Role-Based Access**
   - Manage administrators, campus coordinators, accountants, and faculty.
   - SuperAdmin privileges for Admin.
   - Status toggle (Active / Inactive).

9. **Settings & Firebase Cloud Hub**
   - Academic session setup (Session 2026–2027).
   - Campus & branch manager (Abbottabad, Swat, Nowshera, Mansehra, Peshawar, Haripur, Mardan, Charsadda, Islamabad, Rawalpindi).
   - **Live Firebase Firestore Integration** with 1-click cloud sync.

---

## 🚀 How to Run the App Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18 or higher installed on your computer).

### Step 1: Open the Project
Open terminal or command prompt in the project root directory:
```bash
cd "e:\Its my personal\school mangment system"
```

### Step 2: Start the Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173/
```

---

## 🔥 Connecting Live Google Firebase

The application includes dual-mode persistence:
1. **Local Persistent Mode (Default)**: Runs smoothly without requiring any internet connection or cloud setup, saving everything securely in the browser.
2. **Cloud Mode (Firebase Firestore)**: Live synchronization across multiple branches and administrative devices.

### How to Connect to Your Firebase Project:
1. Go to the [Google Firebase Console](https://console.firebase.google.com/) and log in with your Google account.
2. Click **Create a project**, name it (e.g. `shezad-children-academy`), and follow the prompts.
3. In the left navigation sidebar, click **Build > Firestore Database**, then click **Create database** (start in Test mode or Production mode).
4. In the Project Overview, click the **Web icon (`</>`)** to register a web application.
5. Copy the configuration object keys:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
6. In **Shezad Children Academy**, click **Settings** in the sidebar.
7. Under the **🔥 Firebase Cloud Database** tab, paste the credentials into the corresponding fields.
8. Click **Save & Connect Firebase**.
9. Click **☁️ Upload All Data to Firestore** to instantly sync all student records, staff, fee slips, and ledger vouchers to your Firebase cloud database!

---

*Handover Prepared for Shezad Children Academy*
