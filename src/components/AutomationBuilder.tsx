import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Check,
  Plus,
  Trash2,
  HelpCircle,
  MessageCircle,
  Send,
  Heart,
  Share2,
  Bookmark,
  Instagram,
  Link2,
} from 'lucide-react';
import {
  Automation,
  AutomationActionConfig,
  KeywordMatchType,
  PostTargetType,
} from '../../shared/types';

interface AutomationBuilderProps {
  initialData?: Automation | null;
  onSave: (data: Partial<Automation>) => Promise<void>;
  onCancel: () => void;
  connectedAccountUsername?: string;
}

// Sample Instagram posts for selection
const SAMPLE_POSTS = [
  {
    id: 'post_bangles_reel_99',
    title: 'Pair Bangles Collection',
    caption: 'Festive season pair bangles handcrafted with 22K pure gold. DM or comment PRICE for exclusive bridal discounts!',
    likes: 151,
    comments: 24,
    gradient: 'from-amber-600 via-rose-600 to-purple-800',
    tag: 'PAIR BANGLES',
  },
  {
    id: 'post_necklace_88',
    title: 'Heritage Choker Necklace',
    caption: 'Classic antique craftsmanship with fine emeralds & uncut polki diamonds. Comment LINK for catalog.',
    likes: 248,
    comments: 39,
    gradient: 'from-emerald-700 via-teal-800 to-slate-900',
    tag: 'HERITAGE JEWELS',
  },
  {
    id: 'post_earrings_77',
    title: 'Bridal Jhumkas',
    caption: 'Traditional Temple jewellery jhumkas for auspicious celebrations. Lightweight yet majestic.',
    likes: 95,
    comments: 12,
    gradient: 'from-purple-800 via-pink-700 to-amber-600',
    tag: 'BRIDAL JHUMKAS',
  },
];

export const AutomationBuilder: React.FC<AutomationBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
  connectedAccountUsername = 'vajramakutajewellers',
}) => {
  const [name, setName] = useState(initialData?.name || 'New Comment Automation');
  const [targetPostType, setTargetPostType] = useState<PostTargetType>(
    initialData?.targetPostType || 'all'
  );
  const [selectedPostId, setSelectedPostId] = useState<string>(
    initialData?.targetPostId || SAMPLE_POSTS[0].id
  );
  const [matchType, setMatchType] = useState<KeywordMatchType>(
    initialData?.matchType || 'contains'
  );
  const [keywords, setKeywords] = useState<string[]>(
    initialData?.keywords || ['PRICE', 'PRICE?', 'COST', 'HOW MUCH']
  );
  const [keywordInput, setKeywordInput] = useState('');

  // Actions
  const existingPublicReply = initialData?.actions?.find((a) => a.actionType === 'public_reply');
  const existingPrivateDM = initialData?.actions?.find((a) => a.actionType === 'private_dm');

  const [enablePublicReply, setEnablePublicReply] = useState(
    existingPublicReply ? existingPublicReply.isEnabled : true
  );
  const [publicReplyText, setPublicReplyText] = useState(
    existingPublicReply?.messageTemplate || 'Thanks for your interest! 👋 Check your DM for details.'
  );

  const [enablePrivateDM, setEnablePrivateDM] = useState(
    existingPrivateDM ? existingPrivateDM.isEnabled : true
  );
  const [privateDMText, setPrivateDMText] = useState(
    existingPrivateDM?.messageTemplate ||
      'Hey there! 👋 Thanks so much for reaching out!\nHere are the details and exclusive catalog link:'
  );
  const [dmLinkUrl, setDmLinkUrl] = useState(
    existingPrivateDM?.linkUrl || 'https://example.com/product-catalog'
  );
  const [dmButtonText, setDmButtonText] = useState(
    existingPrivateDM?.linkButtonText || 'View Price & Details'
  );

  // Phone preview tab
  const [previewTab, setPreviewTab] = useState<'post' | 'comments' | 'dm'>('comments');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedPost = SAMPLE_POSTS.find((p) => p.id === selectedPostId) || SAMPLE_POSTS[0];

  const handleAddKeyword = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();

    const clean = keywordInput.replace(/,/g, '').trim().toUpperCase();
    if (clean && !keywords.includes(clean)) {
      setKeywords([...keywords, clean]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter((kw) => kw !== kwToRemove));
  };

  const handleQuickAddKeyword = (kw: string) => {
    if (!keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please provide a name for this automation.');
      return;
    }

    if (keywords.length === 0) {
      setFormError('Please add at least one keyword trigger.');
      return;
    }

    if (!enablePublicReply && !enablePrivateDM) {
      setFormError('Please enable at least one action (Public Reply or Private DM).');
      return;
    }

    const actions: AutomationActionConfig[] = [];

    if (enablePublicReply) {
      if (!publicReplyText.trim()) {
        setFormError('Please write your public comment reply message.');
        return;
      }
      actions.push({
        actionType: 'public_reply',
        messageTemplate: publicReplyText.trim(),
        isEnabled: true,
      });
    }

    if (enablePrivateDM) {
      if (!privateDMText.trim()) {
        setFormError('Please write your private DM message.');
        return;
      }
      actions.push({
        actionType: 'private_dm',
        messageTemplate: privateDMText.trim(),
        linkUrl: dmLinkUrl.trim() || undefined,
        linkButtonText: dmButtonText.trim() || undefined,
        isEnabled: true,
      });
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        targetPostType,
        targetPostId: targetPostType === 'specific' ? selectedPostId : undefined,
        targetPostCaption: targetPostType === 'specific' ? selectedPost.caption : undefined,
        matchType,
        keywords,
        actions,
      });
    } catch (err: any) {
      setFormError(err.message || 'Failed to save automation');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-white overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-semibold text-slate-900 text-sm sm:text-base border-b border-transparent hover:border-slate-300 focus:border-slate-800 focus:outline-none px-1 py-0.5"
            placeholder="Automation Name"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save Automation
          </button>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Configuration Steps (Scrollable) */}
        <div className="w-full lg:w-7/12 overflow-y-auto p-6 lg:p-8 space-y-8 border-r border-slate-200">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {formError}
            </div>
          )}

          {/* STEP 1: Post Scope Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
                1. When someone comments on
              </h2>
            </div>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  targetPostType === 'specific'
                    ? 'border-slate-900 bg-slate-50/50 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="post_target"
                  checked={targetPostType === 'specific'}
                  onChange={() => setTargetPostType('specific')}
                  className="mt-1 accent-slate-900"
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-slate-900 block">
                    A specific post or reel
                  </span>
                  <span className="text-xs text-slate-500">
                    Only trigger this automation on selected media
                  </span>

                  {targetPostType === 'specific' && (
                    <div className="mt-3 grid grid-cols-3 gap-2.5">
                      {SAMPLE_POSTS.map((post) => (
                        <div
                          key={post.id}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedPostId(post.id);
                          }}
                          className={`group relative rounded-lg overflow-hidden border cursor-pointer aspect-square p-2 flex flex-col justify-end text-white text-left transition-all ${
                            selectedPostId === post.id
                              ? 'ring-2 ring-slate-900 border-transparent shadow-xs'
                              : 'border-slate-200 opacity-70 hover:opacity-100'
                          } bg-gradient-to-tr ${post.gradient}`}
                        >
                          <div className="absolute top-2 right-2">
                            {selectedPostId === post.id && (
                              <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-mono tracking-wider font-bold uppercase drop-shadow-xs">
                            {post.tag}
                          </span>
                          <span className="text-[11px] font-medium truncate drop-shadow-xs">
                            {post.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  targetPostType === 'all'
                    ? 'border-slate-900 bg-slate-50/50 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="post_target"
                  checked={targetPostType === 'all'}
                  onChange={() => setTargetPostType('all')}
                  className="mt-1 accent-slate-900"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Any post or reel
                  </span>
                  <span className="text-xs text-slate-500">
                    Triggers across all past and future Instagram posts on @{connectedAccountUsername}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* STEP 2: Keywords Match Configuration */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
              2. And this comment has
            </h2>

            <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3.5">
              {/* Match type toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Matching Mode</span>
                <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setMatchType('contains')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      matchType === 'contains'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Contains (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('exact')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      matchType === 'exact'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Exact Match
                  </button>
                </div>
              </div>

              {/* Keyword Pills */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white rounded-lg border border-slate-200">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-mono font-medium rounded-md"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleAddKeyword}
                  placeholder={keywords.length === 0 ? 'Type keyword and press Enter...' : '+ add more'}
                  className="flex-1 min-w-[120px] text-xs font-mono text-slate-800 focus:outline-none bg-transparent"
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="text-[11px] font-medium text-slate-400">Popular keywords:</span>
                {['PRICE', 'LINK', 'DETAILS', 'COST', 'SHOP', 'BUY'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickAddKeyword(chip)}
                    className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-600 transition-colors"
                  >
                    +{chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 3: Action 1 - Public Comment Reply */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
                  3. Public Comment Reply
                </h2>
                <p className="text-xs text-slate-500">
                  Instantly reply directly under the user's comment
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePublicReply}
                  onChange={(e) => setEnablePublicReply(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            {enablePublicReply && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <textarea
                  value={publicReplyText}
                  onChange={(e) => setPublicReplyText(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  placeholder="e.g. Thanks for your interest! 👋 Check your DM for details."
                />
                <div className="flex justify-between text-[11px] text-slate-400 px-1">
                  <span>Simulated in live preview right panel</span>
                  <span>{publicReplyText.length} characters</span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: Action 2 - Private Instagram DM */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
                  4. Private Instagram Direct Message (DM)
                </h2>
                <p className="text-xs text-slate-500">
                  Send high-converting automated message & product link directly to their inbox
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePrivateDM}
                  onChange={(e) => setEnablePrivateDM(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            {enablePrivateDM && (
              <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening DM Message
                  </label>
                  <textarea
                    value={privateDMText}
                    onChange={(e) => setPrivateDMText(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    placeholder="Write your greeting and product pitch..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Link URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={dmLinkUrl}
                      onChange={(e) => setDmLinkUrl(e.target.value)}
                      placeholder="https://example.com/product"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Button / Link Label
                    </label>
                    <input
                      type="text"
                      value={dmButtonText}
                      onChange={(e) => setDmButtonText(e.target.value)}
                      placeholder="e.g. View Product"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Instagram Phone Simulator */}
        <div className="hidden lg:flex flex-1 bg-slate-100/70 items-center justify-center p-8 overflow-y-auto">
          {/* Phone Shell */}
          <div className="w-[330px] h-[640px] bg-black rounded-[42px] p-3 shadow-2xl ring-1 ring-slate-900/10 flex flex-col relative select-none">
            {/* Dynamic Island / Speaker */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2" />
            </div>

            {/* Inner Phone Screen */}
            <div className="flex-1 bg-white rounded-[32px] overflow-hidden flex flex-col text-slate-900 text-xs relative">
              {/* Phone Status Bar */}
              <div className="h-8 px-6 pt-2 flex items-center justify-between text-[11px] font-semibold text-slate-900">
                <span>9:41</span>
                <div className="flex items-center gap-1 text-[10px]">
                  <span>5G</span>
                  <div className="w-4 h-2 border border-slate-900 rounded-xs p-0.5">
                    <div className="w-full h-full bg-slate-900" />
                  </div>
                </div>
              </div>

              {/* Instagram App Header */}
              <div className="h-10 px-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 flex items-center justify-center">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-[9px] font-bold text-slate-800">
                      VM
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-[11px] block leading-tight truncate max-w-[130px]">
                      {connectedAccountUsername}
                    </span>
                  </div>
                </div>
                <Instagram className="w-4 h-4 text-slate-700" />
              </div>

              {/* Screen Body Views based on previewTab */}
              <div className="flex-1 overflow-y-auto bg-white flex flex-col">
                {previewTab === 'post' && (
                  <div className="space-y-2">
                    {/* Post Image Container */}
                    <div
                      className={`w-full aspect-square bg-gradient-to-tr ${selectedPost.gradient} p-4 flex flex-col justify-between text-white relative`}
                    >
                      <span className="self-end text-[10px] px-2 py-0.5 rounded-full bg-black/40 font-mono">
                        REEL
                      </span>
                      <div>
                        <span className="text-[10px] font-mono tracking-wider font-bold uppercase drop-shadow-md">
                          {selectedPost.tag}
                        </span>
                        <h4 className="font-bold text-sm leading-tight drop-shadow-md">
                          {selectedPost.title}
                        </h4>
                      </div>
                    </div>

                    {/* Engagement Actions */}
                    <div className="px-3 pt-1 flex items-center justify-between text-slate-800">
                      <div className="flex items-center gap-3">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <MessageCircle className="w-4 h-4" />
                        <Share2 className="w-4 h-4" />
                      </div>
                      <Bookmark className="w-4 h-4" />
                    </div>

                    <div className="px-3 text-[11px] space-y-1">
                      <p className="font-bold text-slate-900">{selectedPost.likes} likes</p>
                      <p className="text-slate-700 line-clamp-2 leading-tight">
                        <span className="font-bold text-slate-900 mr-1.5">{connectedAccountUsername}</span>
                        {selectedPost.caption}
                      </p>
                      <p className="text-[10px] text-slate-400">View all {selectedPost.comments} comments</p>
                    </div>
                  </div>
                )}

                {previewTab === 'comments' && (
                  <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                        Live Comment Trigger Simulation
                      </div>

                      {/* Mock User Comment */}
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[9px] text-slate-600 shrink-0">
                          PS
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <span className="font-bold text-[11px] text-slate-900 mr-1.5">
                            priya_sharma
                          </span>
                          <p className="text-slate-800 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100 inline-block">
                            Can you send me the {keywords[0] || 'PRICE'} please?
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-slate-400 pt-0.5">
                            <span>1m</span>
                            <span className="text-rose-500 font-semibold">Matched Keyword</span>
                          </div>
                        </div>
                      </div>

                      {/* Automated Public Reply (Nested) */}
                      {enablePublicReply ? (
                        <div className="ml-6 pl-3 border-l-2 border-slate-200 flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                            VM
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <span className="font-bold text-[11px] text-slate-900 mr-1.5">
                              {connectedAccountUsername}
                            </span>
                            <p className="text-slate-800 text-[11px] bg-slate-100 p-2 rounded-xl border border-slate-200 inline-block">
                              {publicReplyText || 'Thanks for your interest! 👋 Check your DM for details.'}
                            </p>
                            <span className="block text-[9px] text-emerald-600 font-medium">
                              ✓ Automated Public Reply Sent
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="ml-6 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
                          Public Comment Reply is currently disabled.
                        </div>
                      )}
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center text-[10px] text-slate-400">
                      Click the "DM" tab below to preview inbox message
                    </div>
                  </div>
                )}

                {previewTab === 'dm' && (
                  <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                        Direct Message Simulation
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                        <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700">
                          PS
                        </div>
                        <div>
                          <p className="font-bold text-[11px] text-slate-900">priya_sharma</p>
                          <p className="text-[10px] text-slate-400">Instagram Direct</p>
                        </div>
                      </div>

                      {enablePrivateDM ? (
                        <div className="space-y-2">
                          {/* Automated DM Bubble */}
                          <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-xs border border-slate-200 text-slate-800 text-[11px] whitespace-pre-wrap leading-relaxed">
                            {privateDMText}
                          </div>

                          {/* Link Button */}
                          {dmLinkUrl && (
                            <a
                              href={dmLinkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-center text-xs font-semibold shadow-xs"
                            >
                              <span className="flex items-center justify-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5" />
                                {dmButtonText || 'View Product'}
                              </span>
                            </a>
                          )}
                          <span className="block text-[9px] text-emerald-600 font-medium text-center">
                            ✓ Automated Private DM Delivered
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                          Private Instagram DM is currently disabled for this automation.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Interactive Phone Tabs */}
              <div className="h-11 border-t border-slate-200 flex items-center justify-around bg-slate-50 px-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewTab('post')}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    previewTab === 'post'
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Post
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('comments')}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    previewTab === 'comments'
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Comments
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('dm')}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    previewTab === 'dm'
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  DM
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
