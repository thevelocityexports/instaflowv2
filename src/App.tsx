import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TestModeModal } from './components/TestModeModal';
import { AutomationBuilder } from './components/AutomationBuilder';
import { Dashboard } from './pages/Dashboard';
import { Automations } from './pages/Automations';
import { Comments } from './pages/Comments';
import { InstagramConnection } from './pages/InstagramConnection';
import { Settings } from './pages/Settings';
import { ApiClient } from './services/api';
import {
  Automation,
  ExecutionLog,
  DashboardStats,
  InstagramAccount,
  User,
} from '../shared/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccount | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ExecutionLog[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [comments, setComments] = useState<ExecutionLog[]>([]);

  // Modals & Builders
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load all initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userRes, accsRes, statsRes, autosRes, commentsRes] = await Promise.allSettled([
        ApiClient.getCurrentUser(),
        ApiClient.getInstagramAccounts(),
        ApiClient.getDashboardStats(),
        ApiClient.getAutomations(),
        ApiClient.getComments(),
      ]);

      if (userRes.status === 'fulfilled') setCurrentUser(userRes.value.user);
      if (accsRes.status === 'fulfilled' && accsRes.value.accounts.length > 0) {
        setConnectedAccount(accsRes.value.accounts[0]);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.stats);
        setRecentActivity(statsRes.value.recentActivity || []);
      }
      if (autosRes.status === 'fulfilled') setAutomations(autosRes.value.automations);
      if (commentsRes.status === 'fulfilled') setComments(commentsRes.value.comments);
    } catch (err) {
      console.error('Failed to load application state', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for Automations
  const handleCreateNew = () => {
    setEditingAutomation(null);
    setIsBuilderOpen(true);
  };

  const handleEditAutomation = (auto: Automation) => {
    setEditingAutomation(auto);
    setIsBuilderOpen(true);
  };

  const handleSaveAutomation = async (data: Partial<Automation>) => {
    try {
      if (editingAutomation) {
        await ApiClient.updateAutomation(editingAutomation.id, data);
        showToast('Automation updated successfully!');
      } else {
        await ApiClient.createAutomation(data);
        showToast('Automation created successfully!');
      }
      setIsBuilderOpen(false);
      setEditingAutomation(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save automation');
    }
  };

  const handleToggleAutomation = async (id: string) => {
    try {
      const res = await ApiClient.toggleAutomation(id);
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: res.automation.isActive } : a))
      );
      showToast(
        `Automation ${res.automation.isActive ? 'enabled' : 'paused'} successfully`
      );
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle automation');
    }
  };

  const handleDuplicateAutomation = async (id: string) => {
    try {
      await ApiClient.duplicateAutomation(id);
      showToast('Automation duplicated!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate automation');
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    try {
      await ApiClient.deleteAutomation(id);
      showToast('Automation deleted.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete automation');
    }
  };

  const handleDisconnectInstagram = async (accountId?: string) => {
    try {
      await ApiClient.disconnectInstagram(accountId);
      showToast('Instagram account disconnected.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect account');
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'automations':
        return 'Comment Automations';
      case 'comments':
        return 'Received Comments & Logs';
      case 'instagram':
        return 'Instagram Account';
      case 'settings':
        return 'Settings & Supabase';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 antialiased selection:bg-rose-100 selection:text-rose-900">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setIsBuilderOpen(false);
          setActiveTab(tab);
        }}
        connectedAccount={connectedAccount}
        onOpenTestModal={() => setIsTestModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          title={isBuilderOpen ? (editingAutomation ? 'Edit Automation' : 'New Automation') : getPageTitle()}
          subtitle={
            isBuilderOpen
              ? 'Configure keyword triggers & automated actions'
              : connectedAccount?.username
              ? `@${connectedAccount.username}`
              : undefined
          }
          connectedAccount={connectedAccount}
          currentUser={currentUser}
          onOpenTestModal={() => setIsTestModalOpen(true)}
          onOpenMetaGuide={() => {
            setIsBuilderOpen(false);
            setActiveTab('instagram');
          }}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto">
          {isBuilderOpen ? (
            <AutomationBuilder
              initialData={editingAutomation}
              onSave={handleSaveAutomation}
              onCancel={() => {
                setIsBuilderOpen(false);
                setEditingAutomation(null);
              }}
              connectedAccountUsername={connectedAccount?.username || 'vajramakutajewellers'}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  stats={stats}
                  recentActivity={recentActivity}
                  connectedAccount={connectedAccount}
                  onOpenTestModal={() => setIsTestModalOpen(true)}
                  onCreateAutomation={handleCreateNew}
                  onViewComments={() => setActiveTab('comments')}
                  onRefresh={loadData}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'automations' && (
                <Automations
                  automations={automations}
                  connectedAccount={connectedAccount}
                  onCreateNew={handleCreateNew}
                  onEdit={handleEditAutomation}
                  onToggle={handleToggleAutomation}
                  onDuplicate={handleDuplicateAutomation}
                  onDelete={handleDeleteAutomation}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'comments' && (
                <Comments
                  comments={comments}
                  onOpenTestModal={() => setIsTestModalOpen(true)}
                  isLoading={isLoading}
                />
              )}

              {activeTab === 'instagram' && (
                <InstagramConnection
                  connectedAccount={connectedAccount}
                  onDisconnect={handleDisconnectInstagram}
                  onRefresh={loadData}
                />
              )}

              {activeTab === 'settings' && <Settings />}
            </>
          )}
        </main>
      </div>

      {/* Test Mode Simulator Modal */}
      <TestModeModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        automations={automations.filter((a) => a.isActive)}
        onTestExecuted={loadData}
        onNavigateToComments={() => {
          setIsBuilderOpen(false);
          setActiveTab('comments');
        }}
      />
    </div>
  );
}
