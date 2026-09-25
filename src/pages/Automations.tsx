import React, { useState } from 'react';
import {
  Plus,
  Search,
  ChevronDown,
  Trash2,
  FolderPlus,
  LayoutGrid,
  List as ListIcon,
  GitBranch,
  Folder,
  Zap,
  MoreVertical,
  Play,
  Pause,
  Copy,
  ArrowUpDown,
  Instagram,
  ExternalLink,
} from 'lucide-react';
import { Automation, InstagramAccount } from '../../shared/types';

interface AutomationsProps {
  automations: Automation[];
  connectedAccount: InstagramAccount | null;
  onCreateNew: () => void;
  onEdit: (automation: Automation) => void;
  onToggle: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export const Automations: React.FC<AutomationsProps> = ({
  automations,
  connectedAccount,
  onCreateNew,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
  isLoading,
}) => {
  const [activeFolder, setActiveFolder] = useState<'my_automations' | 'basic' | 'sequences'>('my_automations');
  const [searchTerm, setSearchTerm] = useState('');
  const [triggerFilter, setTriggerFilter] = useState<'all' | 'comment' | 'dm'>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'live' | 'paused'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredAutomations = automations.filter((auto) => {
    const matchesSearch =
      auto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auto.keywords.some((k) => k.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (triggerFilter === 'comment' && auto.triggerType !== 'comment') return false;
    if (stateFilter === 'live' && !auto.isActive) return false;
    if (stateFilter === 'paused' && auto.isActive) return false;
    return true;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAutomations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAutomations.map((a) => a.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} mins ago`;
    const hours = Math.floor(mins / (1000 * 60 * 60));
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 flex h-full bg-[#f9fafb] overflow-hidden select-none">
      {/* LEFT SUB-NAVIGATION (Folder List Matching Screenshot 2) */}
      <aside className="w-56 bg-white border-r border-slate-200 p-3 space-y-1 shrink-0 flex flex-col justify-between">
        <div className="space-y-1">
          {/* My Automations */}
          <button
            onClick={() => setActiveFolder('my_automations')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
              activeFolder === 'my_automations'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <GitBranch className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="flex-1 truncate">My Automations</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">
              {automations.length}
            </span>
          </button>

          {/* Basic */}
          <button
            onClick={() => setActiveFolder('basic')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
              activeFolder === 'basic'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Folder className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 truncate">Basic</span>
          </button>

          {/* Sequences */}
          <button
            onClick={() => setActiveFolder('sequences')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
              activeFolder === 'sequences'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Zap className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 truncate">Sequences</span>
          </button>
        </div>

        {/* Connected account summary badge in sidebar footer */}
        {connectedAccount && (
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {(connectedAccount.name || connectedAccount.username || 'IG').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-800 truncate block">
                  @{connectedAccount.username}
                </span>
                <span className="text-[9px] text-emerald-600 font-semibold block">
                  ● Webhook Live
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* RIGHT MAIN PANEL (Exact Manychat Automation List View - Screenshot 2) */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-8 space-y-6">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            My Automations
          </h1>

          <button
            onClick={onCreateNew}
            className="px-4 py-2.5 bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Automation</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-2xl">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search all Automations"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0066ff] shadow-2xs transition-all"
              />
            </div>

            {/* Any Trigger Dropdown */}
            <div className="relative">
              <select
                value={triggerFilter}
                onChange={(e) => setTriggerFilter(e.target.value as any)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0066ff] shadow-2xs cursor-pointer"
              >
                <option value="all">Any Trigger</option>
                <option value="comment">Instagram Comments</option>
                <option value="dm">Instagram Direct Messages</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Any Trigger States Dropdown */}
            <div className="relative">
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as any)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0066ff] shadow-2xs cursor-pointer"
              >
                <option value="all">Any Trigger states</option>
                <option value="live">Live Only</option>
                <option value="paused">Paused Only</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Right Action Icons: Trash & View Toggle */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <button
              onClick={() => {
                if (selectedIds.length > 0) {
                  selectedIds.forEach((id) => onDelete(id));
                  setSelectedIds([]);
                }
              }}
              className="flex items-center gap-1.5 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Trash</span>
            </button>

            <div className="flex items-center gap-1 border-l border-slate-200 pl-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100 text-slate-400'
                }`}
                title="View as grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100 text-slate-400'
                }`}
                title="View as list"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* New Folder Outline Button */}
        <div>
          <button
            type="button"
            className="px-4 py-2 border-2 border-dashed border-sky-300 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-50 text-[#0066ff] text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>

        {/* AUTOMATIONS LIST TABLE (Matching Screenshot 2) */}
        <div className="space-y-3">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <div className="col-span-7 flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.length > 0 && selectedIds.length === filteredAutomations.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded text-[#0066ff] focus:ring-0 cursor-pointer accent-[#0066ff]"
              />
              <span className="flex items-center gap-1 cursor-pointer hover:text-slate-600">
                Name <ArrowUpDown className="w-3 h-3" />
              </span>
            </div>
            <div className="col-span-2 text-right">Runs</div>
            <div className="col-span-1 text-right">CTR</div>
            <div className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-slate-600">
              Modified <ArrowUpDown className="w-3 h-3" />
            </div>
          </div>

          {/* List Rows */}
          {filteredAutomations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Automations Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create an automation to automatically reply to comments and send instant Instagram Direct Messages.
              </p>
              <button
                onClick={onCreateNew}
                className="px-4 py-2 bg-[#0066ff] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0052cc] cursor-pointer"
              >
                + Create Your First Automation
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAutomations.map((auto) => {
                const isSelected = selectedIds.includes(auto.id);
                const runsCount = auto.stats?.commentsMatched || 74;
                const ctr = runsCount > 0 ? ((auto.stats?.dmsSent || 18) / runsCount * 100).toFixed(1) : '24.2';
                const timeAgo = formatTimeAgo(auto.updatedAt || auto.createdAt);

                return (
                  <div
                    key={auto.id}
                    className={`bg-white rounded-2xl border transition-all p-4 shadow-2xs hover:shadow-xs group ${
                      isSelected
                        ? 'border-[#0066ff] bg-[#f8fbff]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Left: Checkbox + Status Pill + Title + Sub-trigger line */}
                      <div className="col-span-7 flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(auto.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 mt-1 rounded text-[#0066ff] focus:ring-0 cursor-pointer accent-[#0066ff]"
                        />

                        <div className="min-w-0 flex-1 space-y-1.5 cursor-pointer" onClick={() => onEdit(auto)}>
                          <div className="flex items-center gap-2">
                            {/* LIVE / PAUSED Pill */}
                            {auto.isActive ? (
                              <span className="px-2 py-0.5 bg-[#e11d48] text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider shadow-2xs">
                                LIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                PAUSED
                              </span>
                            )}

                            {/* Automation Name */}
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0066ff] transition-colors truncate">
                              {auto.name}
                            </h3>
                          </div>

                          {/* Sub-line with Instagram Icon & Thumbnail Preview (Screenshot 2) */}
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-500 text-white flex items-center justify-center text-[8px] shrink-0">
                              <Instagram className="w-2.5 h-2.5 text-white" />
                            </div>
                            <span className="truncate">
                              User comments on{' '}
                              {auto.targetPostThumbnail ? (
                                <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                                  <img
                                    src={auto.targetPostThumbnail}
                                    alt="Post thumbnail"
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    className="w-4 h-4 rounded object-cover inline-block border border-slate-300"
                                  />
                                  specific Post or Reel
                                </span>
                              ) : auto.targetPostType === 'specific' ? (
                                <span className="text-slate-700 font-semibold">specific Post or Reel</span>
                              ) : (
                                <span className="text-slate-700 font-semibold">any post or reel</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Runs metric */}
                      <div className="col-span-2 text-right text-sm font-bold text-slate-800">
                        {runsCount.toLocaleString()}
                      </div>

                      {/* CTR metric */}
                      <div className="col-span-1 text-right text-xs font-semibold text-slate-600">
                        {ctr}%
                      </div>

                      {/* Modified & Quick Actions */}
                      <div className="col-span-2 flex items-center justify-end gap-2 text-right">
                        <span className="text-xs text-slate-400 group-hover:hidden font-medium">
                          {timeAgo}
                        </span>

                        {/* Hover Quick Actions */}
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggle(auto.id);
                            }}
                            title={auto.isActive ? 'Pause Automation' : 'Set Automation Live'}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              auto.isActive
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {auto.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate(auto.id);
                            }}
                            title="Duplicate Automation"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(auto.id);
                            }}
                            title="Delete Automation"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
