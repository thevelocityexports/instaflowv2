import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, MessageSquare, Send, ArrowRight } from 'lucide-react';
import { Automation } from '../../shared/types';
import { ApiClient } from '../services/api';

interface TestModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  automations: Automation[];
  onTestExecuted: () => void;
  onNavigateToComments?: () => void;
}

export const TestModeModal: React.FC<TestModeModalProps> = ({
  isOpen,
  onClose,
  automations,
  onTestExecuted,
  onNavigateToComments,
}) => {
  const [username, setUsername] = useState('priya_sharma');
  const [commentText, setCommentText] = useState('What is the PRICE of this piece?');
  const [selectedAutomationId, setSelectedAutomationId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickKeywords = ['PRICE', 'PRICE?', 'COST', 'LINK', 'DETAILS', 'HOW MUCH'];

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    setTestResult(null);

    try {
      const response = await ApiClient.sendTestComment({
        username,
        commentText: commentText.trim(),
        automationId: selectedAutomationId === 'all' ? undefined : selectedAutomationId,
      });

      setTestResult(response);
      onTestExecuted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute test comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with TEST MODE Banner */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">Instagram Event Simulator</h3>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wide rounded-md border border-amber-300 uppercase">
                  TEST MODE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Executes the exact webhook automation pipeline without calling live Meta servers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <form onSubmit={handleRunTest} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instagram Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-medium">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="customer123"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono"
                  required
                />
              </div>
            </div>

            {/* Comment Text Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Comment Text (Trigger)
                </label>
                <span className="text-[11px] text-slate-400">Keyword match is case-insensitive</span>
              </div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                placeholder="e.g. PRICE PLEASE for this collection"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                required
              />

              {/* Quick Keyword Chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Try keyword:</span>
                {quickKeywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => setCommentText(`Can you please tell me the ${kw}?`)}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono transition-colors"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Automation Filter (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Automation Scope
              </label>
              <select
                value={selectedAutomationId}
                onChange={(e) => setSelectedAutomationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              >
                <option value="all">All Active Automations (Evaluate full pipeline)</option>
                {automations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.keywords.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !commentText.trim()}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Running Automation Pipeline...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Test Comment
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Test Execution Result */}
          {testResult && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Engine Execution Completed
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {testResult.result?.actionsExecuted || 0} Action(s) Executed
                </span>
              </div>

              {testResult.result?.logs && testResult.result.logs.length > 0 ? (
                <div className="space-y-2">
                  {testResult.result.logs.map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="font-semibold text-slate-700">
                          {log.actionType === 'public_reply'
                            ? '💬 Public Comment Reply'
                            : log.actionType === 'private_dm'
                            ? '✉️ Private Direct Message'
                            : 'No Keyword Match'}
                        </span>
                        <span
                          className={`font-medium ${
                            log.actionStatus === 'success'
                              ? 'text-emerald-600'
                              : log.actionStatus === 'failed'
                              ? 'text-rose-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {log.actionStatus.toUpperCase()}
                        </span>
                      </div>

                      {log.matchedKeyword && (
                        <p className="text-slate-500">
                          Matched keyword:{' '}
                          <span className="font-mono font-semibold text-slate-800">
                            "{log.matchedKeyword}"
                          </span>{' '}
                          via {log.automationName || 'Automation'}
                        </p>
                      )}

                      {log.errorMessage && (
                        <p className="text-rose-600 font-mono text-[11px]">
                          Reason: {log.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No actions triggered. Check that the comment includes one of the configured keywords.
                </p>
              )}

              {onNavigateToComments && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToComments();
                  }}
                  className="text-xs text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 pt-1"
                >
                  View full execution details in Comments log
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
