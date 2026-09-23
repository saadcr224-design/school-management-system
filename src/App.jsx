import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import StudentsView from './components/StudentsView';
import FeeSlipsView from './components/FeeSlipsView';
import StaffSalaryView from './components/StaffSalaryView';
import AttendanceView from './components/AttendanceView';
import LedgerView from './components/LedgerView';
import ReportsView from './components/ReportsView';
import UserManagementView from './components/UserManagementView';
import SettingsView from './components/SettingsView';
import NewAdmissionModal from './components/NewAdmissionModal';
import GenerateFeeModal from './components/GenerateFeeModal';
import CollectPaymentModal from './components/CollectPaymentModal';
import SoftwareUpdateModal from './components/SoftwareUpdateModal';
import LoginView from './components/LoginView';

function MainApp() {
  const { activeTab, isAuthenticated, toast } = useApp();

  // Modal states
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [paymentSlipToCollect, setPaymentSlipToCollect] = useState(null);

  const handleOpenPaymentModal = (slip) => {
    setPaymentSlipToCollect(slip);
  };

  return (
    <>
      {/* If not signed in, show the Sign In screen as first page */}
      {!isAuthenticated ? (
        <LoginView />
      ) : (
        <div className="app-container">
          {/* Sidebar matching design */}
          <Sidebar />

          {/* Main Viewport */}
          <div className="main-viewport">
            {/* View Routing */}
            {activeTab === 'dashboard' && (
              <DashboardView 
                onOpenAdmissionModal={() => setIsAdmissionModalOpen(true)}
                onOpenFeeModal={() => setIsFeeModalOpen(true)}
                onOpenPaymentModal={handleOpenPaymentModal}
              />
            )}

            {activeTab === 'students' && (
              <StudentsView 
                onOpenAdmissionModal={() => setIsAdmissionModalOpen(true)}
                onOpenFeeModal={() => setIsFeeModalOpen(true)}
                onOpenPaymentModal={handleOpenPaymentModal}
              />
            )}

            {activeTab === 'feeslips' && (
              <FeeSlipsView 
                onOpenFeeModal={() => setIsFeeModalOpen(true)}
                onOpenPaymentModal={handleOpenPaymentModal}
              />
            )}

            {activeTab === 'staff' && (
              <StaffSalaryView />
            )}

            {activeTab === 'attendance' && (
              <AttendanceView />
            )}

            {activeTab === 'ledger' && (
              <LedgerView />
            )}

            {activeTab === 'reports' && (
              <ReportsView />
            )}

            {activeTab === 'users' && (
              <UserManagementView />
            )}

            {activeTab === 'settings' && (
              <SettingsView />
            )}
          </div>

          {/* Global Modals */}
          <NewAdmissionModal 
            isOpen={isAdmissionModalOpen}
            onClose={() => setIsAdmissionModalOpen(false)}
          />

          <GenerateFeeModal 
            isOpen={isFeeModalOpen}
            onClose={() => setIsFeeModalOpen(false)}
          />

          <CollectPaymentModal 
            slip={paymentSlipToCollect}
            onClose={() => setPaymentSlipToCollect(null)}
          />
        </div>
      )}

      {/* Global Software Update Modal */}
      <SoftwareUpdateModal />

      {/* Global Fast Non-blocking Toast Notification */}
      {toast && (
        <div className={`app-toast toast-${toast.type || 'success'}`}>
          <div className="toast-icon">
            {toast.type === 'danger' ? '🗑️' : toast.type === 'info' ? 'ℹ️' : '✓'}
          </div>
          <div className="toast-message">{toast.message}</div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
