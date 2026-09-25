import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  HelpCircle,
  Link as LinkIcon,
  Phone,
  Video,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Smile,
  PlusCircle,
  ExternalLink,
  Check,
  Home,
  Search,
  Clapperboard,
  User,
  RefreshCw,
  Film,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Automation,
  AutomationActionConfig,
  InstagramAccount,
  InstagramMediaItem,
} from '../../shared/types';
import { ApiClient } from '../services/api';

interface AutomationBuilderProps {
  initialData?: Automation | null;
  onSave: (data: Partial<Automation>) => Promise<void>;
  onCancel: () => void;
  connectedAccount?: InstagramAccount | null;
  connectedAccountUsername?: string;
}

export const AutomationBuilder: React.FC<AutomationBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
  connectedAccount,
  connectedAccountUsername,
}) => {
  const activeUsername =
    connectedAccount?.username ||
    connectedAccountUsername ||
    'your_instagram_handle';

  // Top level tab: 'insights' or 'preview'
  const [topTab, setTopTab] = useState<'insights' | 'preview'>('preview');

  // Name
  const [name, setName] = useState(
    initialData?.name || 'Auto-DM links from comments'
  );

  // Live Media State
  const [liveMedia, setLiveMedia] = useState<InstagramMediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(true);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'reels' | 'posts'>('all');
  const [customReelInput, setCustomReelInput] = useState(
    initialData?.targetPostUrl || initialData?.targetPostId || ''
  );
  const [useCustomUrl, setUseCustomUrl] = useState(
    Boolean(
      initialData?.targetPostUrl ||
        (initialData?.targetPostId &&
          !initialData.targetPostId.startsWith('post_'))
    )
  );

  // Step 1: When someone comments on
  const [targetPostType, setTargetPostType] = useState<'specific' | 'all' | 'next'>(
    (initialData?.targetPostType as any) || 'specific'
  );
  const [selectedPostId, setSelectedPostId] = useState<string>(
    initialData?.targetPostId || ''
  );
  const [selectedPostCaption, setSelectedPostCaption] = useState<string>(
    initialData?.targetPostCaption || ''
  );
  const [selectedPostThumbnail, setSelectedPostThumbnail] = useState<string>(
    initialData?.targetPostUrl || ''
  );

  // Step 2: And this comment has
  const [hasKeywordMode, setHasKeywordMode] = useState<'specific' | 'any'>('specific');
  const [keywords, setKeywords] = useState<string[]>(
    initialData?.keywords && initialData.keywords.length > 0 && initialData.keywords[0] !== '*'
      ? initialData.keywords
      : ['Price', 'Link', 'Shop', 'Cost', 'Order']
  );
  const [keywordInput, setKeywordInput] = useState('');

  // Step 3: Reply to their comments under the post
  const existingPublicReply = initialData?.actions?.find((a) => a.actionType === 'public_reply');
  const [enablePublicReply, setEnablePublicReply] = useState(
    existingPublicReply ? existingPublicReply.isEnabled : false
  );
  const [publicReplyText, setPublicReplyText] = useState(
    existingPublicReply?.messageTemplate || 'Thanks for your interest! 👋 Sent details directly to your DM.'
  );

  // Step 4: "They will get"
  const existingPrivateDM = initialData?.actions?.find((a) => a.actionType === 'private_dm');
  const [enableOpeningDM, setEnableOpeningDM] = useState(true);
  const [openingDMText, setOpeningDMText] = useState(
    "Hey there! Thanks so much for reaching out 😊\n\nClick below to access the full details and link ✨"
  );
  const [openingDMButtonText, setOpeningDMButtonText] = useState('Send me the link');

  // Step 5: "And then, they will get"
  const [enableLinkDM, setEnableLinkDM] = useState(true);
  const [linkDMText, setLinkDMText] = useState(
    existingPrivateDM?.messageTemplate ||
      `Hey! Here are the details for this reel ✨\n\nClick the link below to view or order now:`
  );
  const [linkButtonText, setLinkButtonText] = useState(
    existingPrivateDM?.linkButtonText || 'View Product'
  );
  const [linkUrl, setLinkUrl] = useState(
    existingPrivateDM?.linkUrl || 'https://example.com/product'
  );
  const [followUpIfNotClicked, setFollowUpIfNotClicked] = useState(false);

  // Phone preview tabs: 'post' | 'comments' | 'dm'
  const [phoneTab, setPhoneTab] = useState<'post' | 'comments' | 'dm'>('post');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Live Media
  const fetchLiveMedia = async () => {
    setIsLoadingMedia(true);
    setMediaError(null);
    try {
      const res = await ApiClient.getInstagramMedia(connectedAccount?.id);
      if (res.success && res.media) {
        setLiveMedia(res.media);
        setHasToken(res.hasToken);
        if (res.media.length > 0 && !selectedPostId) {
          setSelectedPostId(res.media[0].id);
          setSelectedPostCaption(res.media[0].caption || '');
          setSelectedPostThumbnail(res.media[0].thumbnailUrl || res.media[0].mediaUrl || '');
        }
      } else {
        setLiveMedia([]);
        setHasToken(res.hasToken);
        if (res.error) setMediaError(res.error);
      }
    } catch (err: any) {
      console.error('Failed to load Instagram media', err);
      setMediaError(err?.message || 'Could not fetch reels from Instagram');
      setLiveMedia([]);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    fetchLiveMedia();
  }, [connectedAccount?.id]);

  // Filter live media
  const filteredMedia = liveMedia.filter((item) => {
    if (mediaFilter === 'reels') return item.isReel;
    if (mediaFilter === 'posts') return !item.isReel;
    return true;
  });

  const selectedItem = liveMedia.find((m) => m.id === selectedPostId);

  const displayThumbnail =
    selectedItem?.thumbnailUrl ||
    selectedItem?.mediaUrl ||
    selectedPostThumbnail ||
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=600&q=80';

  const displayCaption =
    selectedItem?.caption ||
    selectedPostCaption ||
    `${activeUsername} Adorn your moments with perfection. Comment PRICE or LINK to get instant details! ✨`;

  const handleSelectMediaItem = (item: InstagramMediaItem) => {
    setTargetPostType('specific');
    setUseCustomUrl(false);
    setSelectedPostId(item.id);
    setSelectedPostCaption(item.caption || '');
    setSelectedPostThumbnail(item.thumbnailUrl || item.mediaUrl || '');
    if (item.permalink) {
      setCustomReelInput(item.permalink);
    }
  };

  const handleApplyCustomReel = () => {
    const raw = customReelInput.trim();
    if (!raw) return;
    setTargetPostType('specific');
    setUseCustomUrl(true);
    // Parse Reel shortcode or ID from URL e.g. https://www.instagram.com/reel/C8xYz123/
    const reelMatch = raw.match(/reel\/([A-Za-z0-9_-]+)/i) || raw.match(/p\/([A-Za-z0-9_-]+)/i);
    const parsedId = reelMatch ? `reel_${reelMatch[1]}` : raw;
    setSelectedPostId(parsedId);
    setSelectedPostCaption(`Custom Instagram Reel: ${raw}`);
  };

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = keywordInput.replace(/,/g, '').trim();
      if (clean && !keywords.includes(clean)) {
        setKeywords([...keywords, clean]);
        setKeywordInput('');
      }
    }
  };

  const handleQuickAddKeyword = (kw: string) => {
    if (!keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const actions: AutomationActionConfig[] = [];

      if (enablePublicReply && publicReplyText.trim()) {
        actions.push({
          actionType: 'public_reply',
          messageTemplate: publicReplyText.trim(),
          isEnabled: true,
        });
      }

      if (enableLinkDM || enableOpeningDM) {
        actions.push({
          actionType: 'private_dm',
          messageTemplate: linkDMText.trim() || openingDMText.trim(),
          linkUrl: linkUrl.trim() || undefined,
          linkButtonText: linkButtonText.trim() || undefined,
          isEnabled: true,
        });
      }

      await onSave({
        name,
        targetPostType: targetPostType === 'specific' ? 'specific' : targetPostType,
        targetPostId: targetPostType === 'specific' ? selectedPostId : undefined,
        targetPostUrl: targetPostType === 'specific' ? customReelInput || selectedItem?.permalink : undefined,
        targetPostCaption: targetPostType === 'specific' ? displayCaption : undefined,
        matchType: 'contains',
        keywords: hasKeywordMode === 'specific' ? keywords : ['*'],
        actions,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-[#e5e7eb] px-6 flex items-center justify-between bg-white shrink-0 z-10">
        {/* Left: Back Link & Automation Title with LIVE Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-slate-800 hover:text-slate-950 font-medium text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-900 truncate max-w-[260px] sm:max-w-md">
              {name}
            </span>
          </button>
          <span className="bg-[#e53e3e] text-white text-[11px] font-bold px-2 py-0.5 rounded-sm tracking-wider uppercase">
            LIVE
          </span>
        </div>

        {/* Center: Insights & Preview Tabs */}
        <div className="flex items-center gap-6 h-full">
          <button
            onClick={() => setTopTab('insights')}
            className={`h-full text-sm font-semibold border-b-2 transition-all px-1 flex items-center ${
              topTab === 'insights'
                ? 'border-[#0066ff] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setTopTab('preview')}
            className={`h-full text-sm font-semibold border-b-2 transition-all px-1 flex items-center ${
              topTab === 'preview'
                ? 'border-[#0066ff] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-white border border-[#d1d5db] hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-1.5 bg-[#0066ff] hover:bg-[#0052cc] text-white text-sm font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              'Save Automation'
            )}
          </button>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Scrollable Automation Configuration Form */}
        <div className="w-full lg:w-[480px] xl:w-[540px] overflow-y-auto p-6 space-y-6 border-r border-[#e5e7eb] bg-white">
          {/* Section 1: When someone comments on */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#111827] tracking-tight">
                When someone comments on
              </h3>
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                Account: <span className="font-bold text-slate-800">@{activeUsername}</span>
              </span>
            </div>

            {/* Option A: Specific post or reel */}
            <div
              className={`p-4 rounded-xl border transition-all space-y-3 ${
                targetPostType === 'specific'
                  ? 'border-[#0066ff] bg-[#f8fbff]/60'
                  : 'border-[#e5e7eb] hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="post_target"
                    checked={targetPostType === 'specific'}
                    onChange={() => setTargetPostType('specific')}
                    className="accent-[#0066ff] w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    a specific post or reel
                  </span>
                </label>

                <button
                  type="button"
                  onClick={fetchLiveMedia}
                  disabled={isLoadingMedia}
                  title="Refresh from Instagram"
                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMedia ? 'animate-spin' : ''}`} />
                  <span className="text-[11px] font-medium hidden sm:inline">Refresh</span>
                </button>
              </div>

              {targetPostType === 'specific' && (
                <div className="space-y-3 pt-1">
                  {/* Media Filter Tabs */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomUrl(false);
                          setMediaFilter('all');
                        }}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          !useCustomUrl && mediaFilter === 'all'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        All ({liveMedia.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomUrl(false);
                          setMediaFilter('reels');
                        }}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                          !useCustomUrl && mediaFilter === 'reels'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Film className="w-3 h-3" />
                        Reels ({liveMedia.filter((m) => m.isReel).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomUrl(false);
                          setMediaFilter('posts');
                        }}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                          !useCustomUrl && mediaFilter === 'posts'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        Photos
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUseCustomUrl(!useCustomUrl)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                        useCustomUrl ? 'bg-indigo-100 text-indigo-800' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {useCustomUrl ? '✓ Custom URL' : '+ Paste Reel URL'}
                    </button>
                  </div>

                  {/* Custom Reel URL / ID Input Mode */}
                  {useCustomUrl ? (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Paste Instagram Reel or Post Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customReelInput}
                          onChange={(e) => setCustomReelInput(e.target.value)}
                          placeholder="https://www.instagram.com/reel/C8xyz... or Reel ID"
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomReel}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs shrink-0"
                        >
                          Apply
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Target comments specifically made on this Reel or Post URL.
                      </p>
                    </div>
                  ) : (
                    /* Live Media Grid */
                    <div>
                      {isLoadingMedia ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="text-xs font-medium">Fetching reels from @{activeUsername}...</span>
                        </div>
                      ) : filteredMedia.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                          {filteredMedia.map((item) => {
                            const isSelected = selectedPostId === item.id;
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleSelectMediaItem(item)}
                                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-[#0066ff] ring-2 ring-[#0066ff]/20 scale-[0.98]'
                                    : 'border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                <img
                                  src={
                                    item.thumbnailUrl ||
                                    item.mediaUrl ||
                                    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=300&q=80'
                                  }
                                  alt={item.caption || 'Instagram Reel'}
                                  className="w-full h-full object-cover"
                                />

                                {/* Overlay Indicators */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-1.5">
                                  <div className="flex items-center justify-between">
                                    {item.isReel ? (
                                      <span className="bg-black/60 backdrop-blur-xs text-white p-0.5 rounded text-[8px] flex items-center">
                                        <Film className="w-2.5 h-2.5" />
                                      </span>
                                    ) : (
                                      <span />
                                    )}
                                    {isSelected && (
                                      <span className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-0.5">
                                    <p className="text-[8px] text-white font-medium line-clamp-1 leading-tight">
                                      {item.caption || 'Reel Video'}
                                    </p>
                                    <div className="flex items-center gap-1 text-[8px] text-white/90">
                                      <Heart className="w-2 h-2 fill-white/80" />
                                      <span>{item.likeCount ?? 0}</span>
                                      <MessageCircle className="w-2 h-2 ml-1" />
                                      <span>{item.commentsCount ?? 0}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Empty or No Token State */
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                            <Film className="w-4 h-4" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800">
                            {hasToken ? 'No Reels Found' : 'Connect Meta Access Token'}
                          </h4>
                          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                            {hasToken
                              ? `No public media was returned for @${activeUsername}. You can paste a Reel link below.`
                              : `Connect via Meta OAuth or paste your Instagram Reel URL to target specific reels.`}
                          </p>
                          <button
                            type="button"
                            onClick={() => setUseCustomUrl(true)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs inline-flex items-center gap-1 mt-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Paste Custom Reel URL
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Reel Info Badge */}
                  {selectedPostId && (
                    <div className="p-2.5 bg-white border border-blue-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">
                          Target: {selectedItem?.caption || selectedPostCaption || selectedPostId}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                        Selected
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Option B: Any post or reel */}
            <div className="p-3.5 rounded-xl border border-[#e5e7eb] hover:border-slate-300 transition-colors flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                <input
                  type="radio"
                  name="post_target"
                  checked={targetPostType === 'all'}
                  onChange={() => setTargetPostType('all')}
                  className="accent-[#0066ff] w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-800">
                  any post or reel (All content on @{activeUsername})
                </span>
              </label>
              <HelpCircle className="w-4 h-4 text-slate-400" />
            </div>

            {/* Option C: Next post or reel */}
            <div className="p-3.5 rounded-xl border border-[#e5e7eb] hover:border-slate-300 transition-colors flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                <input
                  type="radio"
                  name="post_target"
                  checked={targetPostType === 'next'}
                  onChange={() => setTargetPostType('next')}
                  className="accent-[#0066ff] w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-800">
                  next post or reel (Upcoming uploads)
                </span>
              </label>
              <HelpCircle className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Section 2: And this comment has */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-[#111827] tracking-tight">
              And this comment has
            </h3>

            {/* Specific word card */}
            <div className="p-4 rounded-xl border border-[#e5e7eb] space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="keyword_mode"
                  checked={hasKeywordMode === 'specific'}
                  onChange={() => setHasKeywordMode('specific')}
                  className="accent-[#0066ff] w-4 h-4"
                />
                <span className="text-sm font-semibold text-slate-900">
                  a specific word or words
                </span>
              </label>

              {hasKeywordMode === 'specific' && (
                <div className="space-y-2 pt-1 pl-6">
                  {/* Keyword tag input */}
                  <div className="border border-slate-300 rounded-lg p-2 flex flex-wrap items-center gap-1.5 bg-white min-h-[42px] focus-within:border-[#0066ff] focus-within:ring-2 focus-within:ring-[#0066ff]/10">
                    {keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-800 text-xs font-medium rounded-md"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(kw)}
                          className="text-slate-400 hover:text-slate-700"
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
                      placeholder={keywords.length === 0 ? 'Type keyword & press Enter' : ''}
                      className="flex-1 min-w-[140px] text-xs text-slate-800 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Use commas or Enter to add keywords</p>

                  {/* For example chips */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                    <span>For example:</span>
                    {['Price', 'Link', 'Shop', 'Order', 'Cost'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleQuickAddKeyword(chip)}
                        className="px-2.5 py-0.5 bg-[#f0f4ff] hover:bg-[#e1ecff] text-[#0066ff] font-medium rounded-full text-xs transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Any word card */}
            <div className="p-3.5 rounded-xl border border-[#e5e7eb] hover:border-slate-300 transition-colors">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="keyword_mode"
                  checked={hasKeywordMode === 'any'}
                  onChange={() => setHasKeywordMode('any')}
                  className="accent-[#0066ff] w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-800">any word</span>
              </label>
            </div>

            {/* Public reply toggle card */}
            <div className="p-4 rounded-xl border border-[#e5e7eb] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">
                  reply to their comments under the post
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePublicReply}
                    onChange={(e) => setEnablePublicReply(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0066ff]"></div>
                </label>
              </div>

              {enablePublicReply && (
                <div className="pt-1 space-y-1">
                  <textarea
                    value={publicReplyText}
                    onChange={(e) => setPublicReplyText(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-[#0066ff] focus:bg-white"
                    placeholder="Write public comment reply..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: "They will get" */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-[#111827] tracking-tight">
              They will get
            </h3>

            {/* An Opening DM card */}
            <div className="p-4 rounded-xl border border-[#e5e7eb] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  an opening DM
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableOpeningDM}
                    onChange={(e) => setEnableOpeningDM(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0066ff]"></div>
                </label>
              </div>

              {enableOpeningDM && (
                <div className="space-y-2.5 pt-1">
                  <div className="relative">
                    <textarea
                      value={openingDMText}
                      onChange={(e) => setOpeningDMText(e.target.value)}
                      rows={3}
                      className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed outline-none focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]"
                    />
                  </div>

                  <input
                    type="text"
                    value={openingDMButtonText}
                    onChange={(e) => setOpeningDMButtonText(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#0066ff]"
                    placeholder="Button Text (e.g. Send me the link)"
                  />
                </div>
              )}
            </div>

            {/* And then, they will get a DM with a link */}
            <div className="p-4 rounded-xl border border-[#e5e7eb] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  a DM with a link
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableLinkDM}
                    onChange={(e) => setEnableLinkDM(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0066ff]"></div>
                </label>
              </div>

              {enableLinkDM && (
                <div className="space-y-3 pt-1">
                  <textarea
                    value={linkDMText}
                    onChange={(e) => setLinkDMText(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-[#0066ff] ring-1 ring-[#0066ff] rounded-xl text-xs text-slate-800 leading-relaxed outline-none"
                    placeholder="Write a message"
                  />

                  <div className="flex items-center gap-2 p-2.5 border border-slate-300 rounded-xl bg-white">
                    <input
                      type="text"
                      value={linkButtonText}
                      onChange={(e) => setLinkButtonText(e.target.value)}
                      className="flex-1 text-xs text-slate-800 font-medium outline-none"
                      placeholder="Button Label (e.g. Order Now)"
                    />
                    <LinkIcon className="w-4 h-4 text-[#0066ff]" />
                  </div>

                  <div className="flex items-center gap-2 p-2.5 border border-slate-300 rounded-xl bg-white">
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="flex-1 text-xs text-slate-800 outline-none"
                      placeholder="https://yourstore.com/product-link"
                    />
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Phone Preview */}
        <div className="flex-1 bg-[#f4f5f7] flex flex-col items-center justify-center p-6 relative overflow-y-auto">
          {/* Phone View Selector Tabs */}
          <div className="mb-4 flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-semibold">
            <button
              onClick={() => setPhoneTab('post')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                phoneTab === 'post' ? 'bg-[#0066ff] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Post Preview
            </button>
            <button
              onClick={() => setPhoneTab('comments')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                phoneTab === 'comments' ? 'bg-[#0066ff] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comments
            </button>
            <button
              onClick={() => setPhoneTab('dm')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                phoneTab === 'dm' ? 'bg-[#0066ff] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              DM Flow
            </button>
          </div>

          {/* Phone Mockup Frame */}
          <div className="w-[330px] h-[640px] bg-[#101216] rounded-[44px] p-3 shadow-2xl ring-1 ring-slate-900/10 flex flex-col relative select-none">
            {/* Dynamic Island */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2" />
            </div>

            {/* Inner Phone Display */}
            <div className="flex-1 bg-white rounded-[34px] overflow-hidden flex flex-col text-slate-900 text-xs relative">
              {/* Status Bar */}
              <div className="h-8 px-6 pt-2 flex items-center justify-between text-[11px] font-semibold text-slate-900 bg-white shrink-0">
                <span>{phoneTab === 'dm' ? '4:28' : '11:29'}</span>
                <div className="flex items-center gap-1 text-[10px]">
                  <span>5G</span>
                  <div className="w-4 h-2 border border-slate-900 rounded-xs p-0.5">
                    <div className="w-full h-full bg-slate-900" />
                  </div>
                </div>
              </div>

              {/* POST VIEW */}
              {phoneTab === 'post' && (
                <div className="flex-1 overflow-y-auto flex flex-col bg-white">
                  <div className="h-9 px-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <ChevronLeft className="w-4 h-4 text-slate-800" />
                    <div className="text-center">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none truncate max-w-[150px]">
                        {activeUsername}
                      </span>
                      <span className="text-[11px] font-extrabold text-slate-900 leading-none">
                        Reels
                      </span>
                    </div>
                    <div className="w-4" />
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-[8px] font-bold text-white uppercase shrink-0">
                        {activeUsername.slice(0, 2)}
                      </div>
                      <span className="font-bold text-[11px] text-slate-900 truncate max-w-[160px]">
                        {activeUsername}
                      </span>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-slate-700" />
                  </div>

                  {/* Reel Media Preview */}
                  <div className="w-full aspect-[4/4] bg-slate-900 relative overflow-hidden shrink-0">
                    <img
                      src={displayThumbnail}
                      alt="Reel Media"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                      <Film className="w-2.5 h-2.5" /> Reel
                    </div>
                  </div>

                  {/* Actions & Caption */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Heart className="w-4 h-4" />
                        <MessageCircle className="w-4 h-4" />
                        <Send className="w-4 h-4" />
                      </div>
                      <Bookmark className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-800 leading-tight">
                        <span className="font-bold mr-1.5">{activeUsername}</span>
                        {displayCaption}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Add a comment (e.g. "{keywords[0] || 'PRICE'}")...</span>
                      <span className="text-blue-600 font-bold text-[10px]">Post</span>
                    </div>
                  </div>
                </div>
              )}

              {/* COMMENTS VIEW */}
              {phoneTab === 'comments' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
                  <div className="h-8 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Comments</span>
                    <span className="text-slate-400 text-[10px]">Active Automation</span>
                  </div>

                  {/* User Comment */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px]">
                        JD
                      </div>
                      <div className="flex-1 bg-slate-50 p-2.5 rounded-xl text-[11px]">
                        <span className="font-bold text-slate-900 block">shopper_jane</span>
                        <span>{keywords[0] || 'PRICE'} please!</span>
                      </div>
                    </div>

                    {/* Bot Public Reply */}
                    {enablePublicReply && (
                      <div className="flex items-start gap-2 pl-6">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 text-white font-bold flex items-center justify-center text-[8px]">
                          {activeUsername.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 bg-blue-50 border border-blue-100 p-2 rounded-xl text-[11px] text-slate-800">
                          <span className="font-bold text-blue-700 block">@{activeUsername}</span>
                          <span>{publicReplyText}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DM VIEW */}
              {phoneTab === 'dm' && (
                <div className="flex-1 overflow-y-auto flex flex-col justify-between p-3 bg-slate-50">
                  <div className="text-center py-2 border-b border-slate-200 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs mx-auto">
                      {activeUsername.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-xs text-slate-900 block mt-1">
                      {activeUsername}
                    </span>
                    <span className="text-[10px] text-slate-400">Instagram Direct</span>
                  </div>

                  <div className="space-y-2.5">
                    {enableOpeningDM && (
                      <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-slate-200 shadow-2xs space-y-2 text-[11px] text-slate-800">
                        <p className="whitespace-pre-line">{openingDMText}</p>
                        <button
                          type="button"
                          className="w-full py-1.5 bg-[#0066ff] text-white font-semibold rounded-lg text-center text-xs shadow-xs"
                        >
                          {openingDMButtonText}
                        </button>
                      </div>
                    )}

                    {enableLinkDM && (
                      <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-slate-200 shadow-2xs space-y-2 text-[11px] text-slate-800">
                        <p className="whitespace-pre-line font-medium">{linkDMText}</p>
                        <a
                          href={linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-center text-xs shadow-xs"
                        >
                          {linkButtonText} 🔗
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <div className="bg-white border border-slate-200 rounded-full px-3 py-1.5 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Message...</span>
                      <Smile className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
