# Shezad Children Academy - School Management System
## Client Handover & Enhancement Guide (v2.4.0)

Welcome to the enhanced **Shezad Children Academy Management System**, a modern, high-performance, full-featured web application engineered specifically for educational institutions and multi-campus networks.

---

## 🔐 Administrative Login Credentials

The application opens directly to the **Sign In** screen.

- **Email / Username**: `admin` (or `admin123`)
- **Password**: `admin123` (or `admin`)

*Session authentication is automatically persisted in the browser. You can click **Sign out** at the bottom of the sidebar at any time to return to the login screen.*

---

## 🔄 Software Update & Central Distribution Engine

The software features a built-in **Software Update Engine**:

1. Click the **"🔄 Software Update"** button on the **Sign In** screen, at the bottom of the **Sidebar**, or in **Settings**.
2. The system checks the central registry, validates all fee calculation schemas, updates local caches, and ensures all campuses/stations stay 100% in sync with the latest build.
3. Your student records, financial ledgers, and attendance history remain safely preserved.

---

## 🌟 Enhanced Key Application Features (v2.4.0)

1. **Dashboard & Executive Analytics**
   - 8 live KPI cards: Active Students, New Admissions, Total Fee Collection, Today's Collection, Monthly Collection, Outstanding Fees, Total Discounts, and Transport Collection.
   - **Interactive 12-Month Academic Financial Graph (April 2026 → March 2027)** with 1-click toggles between Collected Fees, Outstanding Arrears, Total Billed, and Discounts.
   - Student enrollment and transport distribution charts.

2. **Fee Management & Redesigned 2-Copy Fee Slips**
   - **Bank Copy Completely Removed**: Restructured into a clean, balanced **2-Copy layout** (**School Copy** & **Student / Parent Copy**) that fills standard printable paper without gaps.
   - **Complete Fee Breakdown**: Tuition Fee, Transport Fee, Admission Fee, Examination Fee, Misc Charges (uniform, books, etc.), Subtotal, Discount, Net Payable, Paid Amount, and Remaining Balance.
   - **April to March Sequence**: Standard 12-month sequence utilized consistently across all challans, reports, and dashboards.
   - **Parent Contact Number**: Automatically populated on all fee challans and receipts.

3. **Fee Reminders & Defaulters Tracking**
   - Real-time list of unpaid, partial, and overdue students.
   - Displays Student Name, Roll No, Class, Billing Month, Total Fee, Paid, Remaining Balance, and Contact Phone.
   - **1-Click WhatsApp / SMS Reminder Copy** and **Official Printable Reminder Notice**.

4. **Student Overall Fee Structure & Change History**
   - Complete financial history and ledger modal for every student.
   - View historical tuition, transport, admission, and previous fee vouchers.
   - **Fee Structure Revision**: Update tuition or transport fee with an effective date and reason without altering historical financial vouchers.

5. **Transport Fee Module**
   - Assign transport charges and specific route details to students.
   - Separately calculated and displayed on fee challans, student profiles, and reports.

6. **Miscellaneous Charges Support**
   - Itemize uniform, books, lab/sports, and event charges with custom descriptions.

7. **8 Comprehensive Executive Reports**
   - **1. Monthly Fee Report (April → March)**: 12-month tabular audit with billing, collections, transport, and recovery %.
   - **2. Student Ledger Report**: Complete financial history of any selected student.
   - **3. Outstanding Fee / Defaulters Report**: Students with overdue balance, class, month, remaining amount, and contact numbers.
   - **4. Collection Report**: Daily and monthly collections by payment channel.
   - **5. Discount Report**: Sibling concessions and special discounts breakdown.
   - **6. Transport Fee Report**: Transport collections by route and class.
   - **7. Miscellaneous Charges Report**: Uniforms, books, activity fee collections.
   - **8. Admission Fee Report**: New admission fee receipts.
   - **1-Click CSV Export & Full-Page Printing** on all reports.

8. **Staff & Payroll Management**
   - Faculty roster with designation, assigned campus, and basic pay.
   - Monthly salary disbursal with automatic General Ledger debit recording.

9. **Daily Attendance System**
   - Student and Faculty daily attendance with 1-click shortcuts and percentage metrics.

10. **School Financial Ledger**
    - Double-entry cash book tracking collections, salaries, rent, utilities, and expenses.

---

## 🚀 How to Run the App Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18 or higher installed on your computer).

### Step 1: Open Terminal in Project Folder
```bash
npm install
npm run dev
```

### Step 2: Open in Browser
Navigate to `http://localhost:5173/` in your browser.
