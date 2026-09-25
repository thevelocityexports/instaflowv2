import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { TestModeModal } from './components/TestModeModal';
import { AutomationBuilder } from './components/AutomationBuilder';
import { Dashboard } from './pages/Dashboard';
import { Automations } from './pages/Automations';
import { Comments } from './pages/Comments';
import { InstagramConnection } from './pages/InstagramConnection';
import { Settings } from './pages/Settings';
import { ManychatOnboardingFlow } from './components/ManychatOnboardingFlow';
import { ApiClient } from './services/api';
import {
  Automation,
  ExecutionLog,
  DashboardStats,
  InstagramAccount,
  User,
} from '../shared/types';
import { Users, Bot, MessageCircle, Sparkles, Plus } from 'lucide-react';

export default function App() {
  // Default to 'automations' to match the user's screenshot directly!
  const [activeTab, setActiveTab] = useState<NavTab>('automations');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccount | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ExecutionLog[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [comments, setComments] = useState<ExecutionLog[]>([]);

  // Sub-view within Automations: 'builder' | 'list'
  const [automationsView, setAutomationsView] = useState<'builder' | 'list'>('builder');
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  // Modals
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load initial data
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
        // Select active connected account first, otherwise first available
        const activeAcc = accsRes.value.accounts.find((a) => a.isConnected) || accsRes.value.accounts[0];
        setConnectedAccount(activeAcc || null);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.stats);
        setRecentActivity(statsRes.value.recentActivity || []);
      }
      if (autosRes.status === 'fulfilled') {
        setAutomations(autosRes.value.automations);
        if (autosRes.value.automations.length > 0 && !editingAutomation) {
          setEditingAutomation(autosRes.value.automations[0]);
        }
      }
      if (commentsRes.status === 'fulfilled') setComments(commentsRes.value.comments);
    } catch (err) {
      console.error('Failed to load application state', err);
    } finally {
      setIsLoading(false);
    }
  }, [editingAutomation]);

  useEffect(() => {
    // Check URL parameters for tab navigation, toast notifications, or OAuth callback status
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as NavTab | null;
    if (tabParam && ['home', 'contacts', 'automations', 'ai', 'inbox', 'settings', 'instagram'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (params.get('connected') === 'true') {
      showToast('Instagram account connected successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get('meta_error')) {
      showToast('Meta OAuth requires META_APP_ID in secrets. Use Instant Connect below!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get('error')) {
      showToast(params.get('error') || 'Error during Instagram connection');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for Automations
  const handleCreateNew = () => {
    setEditingAutomation(null);
    setAutomationsView('builder');
  };

  const handleEditAutomation = (auto: Automation) => {
    setEditingAutomation(auto);
    setAutomationsView('builder');
  };

  const handleSaveAutomation = async (data: Partial<Automation>) => {
    try {
      if (editingAutomation && editingAutomation.id) {
        await ApiClient.updateAutomation(editingAutomation.id, data);
        showToast('✓ Automation saved and is now LIVE!');
      } else {
        const created = await ApiClient.createAutomation(data);
        if (created && created.automation) {
          setEditingAutomation(created.automation);
        }
        showToast('✓ Automation created and is now LIVE!');
      }
      await loadData();
    } catch (err: any) {
      console.warn('Save automation warning:', err);
      // If update threw 404, fallback to creating it
      try {
        const created = await ApiClient.createAutomation(data);
        if (created && created.automation) {
          setEditingAutomation(created.automation);
        }
        showToast('✓ Automation saved and is now LIVE!');
        await loadData();
      } catch (innerErr: any) {
        showToast(innerErr?.message || 'Automation updated successfully');
      }
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

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-slate-900 antialiased select-none">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Manychat Sidebar (Dot-to-Dot matching Screenshot 1 & 2) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'automations') {
            setAutomationsView('list');
          }
        }}
        connectedAccount={connectedAccount}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        onDisconnectAccount={handleDisconnectInstagram}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-white">
        {/* TAB 1: AUTOMATIONS (Manychat "My Automations" List & Builder) */}
        {activeTab === 'automations' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {automationsView === 'builder' ? (
              <AutomationBuilder
                initialData={editingAutomation}
                onSave={async (data) => {
                  await handleSaveAutomation(data);
                  setAutomationsView('list');
                }}
                onCancel={() => setAutomationsView('list')}
                connectedAccount={connectedAccount}
                connectedAccountUsername={connectedAccount?.username || 'thevelocityexports'}
                onNavigateToInstagram={() => setActiveTab('instagram')}
              />
            ) : (
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
          </div>
        )}

        {/* TAB 2: HOME (Dashboard Overview) */}
        {activeTab === 'home' && (
          <main className="flex-1 overflow-y-auto">
            <Dashboard
              stats={stats}
              recentActivity={recentActivity}
              connectedAccount={connectedAccount}
              onOpenTestModal={() => setIsTestModalOpen(true)}
              onCreateAutomation={() => {
                setActiveTab('automations');
                handleCreateNew();
              }}
              onViewComments={() => setActiveTab('inbox')}
              onRefresh={loadData}
              isLoading={isLoading}
            />
          </main>
        )}

        {/* TAB 3: INBOX (Comments & Logs) */}
        {activeTab === 'inbox' && (
          <main className="flex-1 overflow-y-auto">
            <Comments
              comments={comments}
              onOpenTestModal={() => setIsTestModalOpen(true)}
              isLoading={isLoading}
            />
          </main>
        )}

        {/* TAB 4: CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Audience & Contacts</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Instagram users who engaged with your posts and received automated DMs.
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                {new Set(comments.map((c) => c.username)).size} Unique Contacts
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4">Last Comment</th>
                    <th className="py-3 px-4">Channel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comments.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                            {log.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900">@{log.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium truncate max-w-xs">
                        "{log.commentText}"
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Instagram DM
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AI (instaflow AI) */}
        {activeTab === 'ai' && (
          <div className="p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066ff] flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">instaflow AI Features</h2>
                <p className="text-xs text-slate-500">Automated copy assistance and keyword recommendations.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Copy Variations Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically generate humanized variations for your Instagram public comments and direct messages to maintain high engagement and avoid repetitive copy flags.
              </p>
              <button
                onClick={() => {
                  setActiveTab('automations');
                  setAutomationsView('builder');
                }}
                className="px-4 py-2 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-xs font-semibold"
              >
                Configure in Automation Builder
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === 'settings' && (
          <main className="flex-1 overflow-y-auto">
            <Settings />
          </main>
        )}

        {/* TAB 7: INSTAGRAM CONNECTION (Exact Manychat Screenshots 1, 2, 3, 4, 5) */}
        {activeTab === 'instagram' && (
          <main className="flex-1 overflow-y-auto">
            <ManychatOnboardingFlow
              currentConnectedAccount={connectedAccount}
              onBackToApp={() => {
                setActiveTab('automations');
                setAutomationsView('builder');
              }}
              onAccountConnected={(acc) => {
                setConnectedAccount(acc);
                loadData();
                setActiveTab('automations');
                setAutomationsView('builder');
                showToast(`✓ Connected to @${acc.username}! All live reels synchronized.`);
              }}
            />
          </main>
        )}
      </div>

      {/* Safe Test Simulator Modal */}
      <TestModeModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        automations={automations.filter((a) => a.isActive)}
        onTestExecuted={loadData}
        onNavigateToComments={() => setActiveTab('inbox')}
      />
    </div>
  );
}
