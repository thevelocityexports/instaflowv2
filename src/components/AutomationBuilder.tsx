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
  X,
  SlidersHorizontal,
  Instagram,
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
  onNavigateToInstagram?: () => void;
}

export const AutomationBuilder: React.FC<AutomationBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
  connectedAccount,
  connectedAccountUsername,
  onNavigateToInstagram,
}) => {
  const activeUsername =
    connectedAccount?.username ||
    connectedAccountUsername ||
    'panchalohajewels';

  const activeName =
    connectedAccount?.name ||
    'Panchaloha Jewellers';

  // Name
  const [name, setName] = useState(
    initialData?.name || 'Auto-DM links from comments'
  );

  // Live Media State (starts from cached synced reels so it never flickers or resets)
  const [liveMedia, setLiveMedia] = useState<InstagramMediaItem[]>(() => {
    try {
      const active = localStorage.getItem('instaflow_active_reels') || localStorage.getItem(`instaflow_media_${activeUsername}`);
      if (active) {
        const parsed = JSON.parse(active);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [searchReelTerm, setSearchReelTerm] = useState('');

  // Step 1: When someone comments on
  const [targetPostType, setTargetPostType] = useState<'specific' | 'all' | 'next'>(
    (initialData?.targetPostType as any) || 'specific'
  );
  const [selectedPostId, setSelectedPostId] = useState<string>(
    initialData?.targetPostId || ''
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
      `✨ **Panchaloha Festive Jewellery** ✨\n\nElegant Traditional Panchaloha Collection with handcrafted finish, perfect for festive wear and auspicious moments. 💛✨\n\n📦 **Available for Order**\n💬 Reply **'ORDER'** to know the price and details.\n🛍️ Check the link below to order online:\n\n📞 **For Orders & Enquiries:**\n9642064207`
  );
  const [linkButtonText, setLinkButtonText] = useState(
    existingPrivateDM?.linkButtonText || 'Order Now'
  );
  const [linkUrl, setLinkUrl] = useState(
    existingPrivateDM?.linkUrl || 'https://example.com/festive-collection'
  );
  const [followUpIfNotClicked, setFollowUpIfNotClicked] = useState(false);

  // Phone preview tabs: 'post' | 'comments' | 'dm'
  const [phoneTab, setPhoneTab] = useState<'post' | 'comments' | 'dm'>('post');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Fetch Media with LocalStorage Cache
  const fetchLiveMedia = async () => {
    setIsLoadingMedia(true);
    try {
      const cacheKey = `instaflow_media_${activeUsername}`;
      const localCached = localStorage.getItem(cacheKey);
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLiveMedia(parsed);
          }
        } catch (e) {}
      }

      const res = await ApiClient.getInstagramMedia(connectedAccount?.id);
      if (res && res.success && res.media && res.media.length > 0) {
        setLiveMedia(res.media);
        localStorage.setItem(cacheKey, JSON.stringify(res.media));
        if (!selectedPostId || !res.media.some((m) => m.id === selectedPostId)) {
          setSelectedPostId(res.media[0].id);
        }
      }
    } catch (err: any) {
      // Gracefully handle if not yet authenticated or network issue
      if (err?.message && !err.message.includes('Unauthorized')) {
        console.warn('Could not refresh Instagram media:', err?.message || err);
      }
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    fetchLiveMedia();
  }, [connectedAccount?.id, activeUsername]);

  const selectedItem =
    liveMedia.find((m) => m.id === selectedPostId) ||
    (initialData?.targetPostThumbnail
      ? {
          id: initialData.targetPostId || 'selected_reel',
          caption: initialData.targetPostCaption || '',
          mediaType: 'IMAGE' as const,
          isReel: true,
          thumbnailUrl: initialData.targetPostThumbnail,
          mediaUrl: initialData.targetPostThumbnail,
          permalink: initialData.targetPostUrl,
        }
      : liveMedia[0] || null);

  const displayThumbnail =
    (selectedPostId && initialData?.targetPostId && selectedPostId === initialData.targetPostId && initialData.targetPostThumbnail) ||
    selectedItem?.thumbnailUrl ||
    selectedItem?.mediaUrl ||
    initialData?.targetPostThumbnail ||
    'https://images.unsplash.com/photo-1611591475879-114c004d80a1?auto=format&fit=crop&w=600&q=80';

  const displayCaption =
    (selectedPostId && initialData?.targetPostId && selectedPostId === initialData.targetPostId && initialData.targetPostCaption) ||
    selectedItem?.caption ||
    initialData?.targetPostCaption ||
    `${activeUsername} ✨ THIS FESTIVAL SEASON, CELEBRATE WITH TIMELESS TRADITION! ✨ Celebrate every special occasion with the elegance of a beautiful Mangalsutra & Panchaloha collection. 💛 A symbol of tradition, love and timeless beauty. 📞 96420 64207`;

  const handleSelectReel = (item: InstagramMediaItem) => {
    setTargetPostType('specific');
    setSelectedPostId(item.id);
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
    setSaveToast(null);
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
        instagramAccountId: connectedAccount?.id,
        targetPostType: targetPostType,
        targetPostId: targetPostType === 'specific' ? selectedPostId || selectedItem?.id : undefined,
        targetPostUrl: selectedItem?.permalink,
        targetPostThumbnail: displayThumbnail,
        targetPostCaption: targetPostType === 'specific' ? displayCaption : undefined,
        matchType: 'contains',
        keywords: hasKeywordMode === 'specific' ? keywords : ['*'],
        actions,
      });

      setSaveToast('✓ Automation saved & activated successfully!');
      setTimeout(() => setSaveToast(null), 3500);
    } catch (err: any) {
      console.error(err);
      setSaveToast(`Error: ${err?.message || 'Failed to save automation'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans select-none">
      {/* Top Header Bar (Matching Manychat Screenshot 1 & 2) */}
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

        {/* Center: Toast Notification if saved */}
        {saveToast && (
          <div className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-full animate-in fade-in flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{saveToast}</span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {onNavigateToInstagram && (
            <button
              onClick={onNavigateToInstagram}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>Connect / Switch IG</span>
            </button>
          )}
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
              'Go Live'
            )}
          </button>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Scrollable Manychat-Style Automation Form (Matching Screenshot 2) */}
        <div className="w-full lg:w-[460px] xl:w-[500px] overflow-y-auto p-6 space-y-6 border-r border-[#e5e7eb] bg-white">
          {/* Section 1: When someone comments on */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[#111827] tracking-tight">
              When someone comments on
            </h3>

            {/* (•) a specific post or reel - WITH 4 REEL CARDS SIDE BY SIDE & "Show All" (Screenshot 2) */}
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
                  className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
                  title="Refresh reels"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMedia ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* 4 REEL CARDS SIDE BY SIDE (Matching Manychat Screenshot 2) */}
              <div className="pt-1">
                <div className="grid grid-cols-4 gap-2">
                  {liveMedia.slice(0, 4).map((item, idx) => {
                    const isSelected = selectedPostId === item.id;
                    const fallbackTitles = [
                      'PANCHALOHA SUTRALU',
                      'PAIR BANGLES',
                      'FESTIVE OFFER',
                      '10% DISCOUNT',
                    ];
                    const overlay = (item as any).overlayText || fallbackTitles[idx] || 'REEL';

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectReel(item)}
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected && targetPostType === 'specific'
                            ? 'border-[#0066ff] ring-2 ring-[#0066ff]/20 scale-[0.98]'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={item.thumbnailUrl || item.mediaUrl}
                          alt={item.caption || 'Instagram Reel'}
                          onError={(e) => {
                            const fallbacks = [
                              'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
                              'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80',
                              'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=600&q=80',
                              'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80',
                            ];
                            e.currentTarget.src = fallbacks[idx % fallbacks.length];
                          }}
                          className="w-full h-full object-cover"
                        />
                        {/* Reel Indicator & Overlay Tag */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1">
                          <span className="text-[8px] font-black text-amber-300 uppercase leading-none drop-shadow-md truncate">
                            {overlay}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Show All blue link (Matching Screenshot 2) */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAllModal(true)}
                    className="text-xs font-semibold text-[#0066ff] hover:underline flex items-center gap-1"
                  >
                    <span>Show All</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({liveMedia.length} reels from @{activeUsername})
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ( ) any post or reel */}
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
                  any post or reel
                </span>
              </label>
              <HelpCircle className="w-4 h-4 text-slate-400" />
            </div>

            {/* ( ) next post or reel */}
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
                  next post or reel
                </span>
              </label>
              <HelpCircle className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Section 2: And this comment has (Matching Screenshot 2) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-[#111827] tracking-tight">
              And this comment has
            </h3>

            {/* (•) a specific word or words */}
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
                      placeholder={keywords.length === 0 ? 'Enter a word or multiple' : ''}
                      className="flex-1 min-w-[140px] text-xs text-slate-800 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Use commas to separate words</p>

                  {/* For example chips (Matching Screenshot 2) */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                    <span>For example:</span>
                    {['Price', 'Link', 'Shop'].map((chip) => (
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

            {/* ( ) any word */}
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

            {/* reply to their comments under the post (Matching Screenshot 2) */}
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
                    placeholder="Write comment reply..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: They will get */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-[#111827] tracking-tight">
              They will get
            </h3>

            {/* An Opening DM */}
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
                  <textarea
                    value={openingDMText}
                    onChange={(e) => setOpeningDMText(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed outline-none focus:border-[#0066ff]"
                  />
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

            {/* A DM with a link */}
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
                    rows={6}
                    className="w-full p-3 border border-[#0066ff] ring-1 ring-[#0066ff] rounded-xl text-xs text-slate-800 leading-relaxed outline-none"
                    placeholder="Write a message"
                  />

                  <div className="flex items-center gap-2 p-2.5 border border-slate-300 rounded-xl bg-white">
                    <input
                      type="text"
                      value={linkButtonText}
                      onChange={(e) => setLinkButtonText(e.target.value)}
                      className="flex-1 text-xs text-slate-800 font-medium outline-none"
                      placeholder="Button Label"
                    />
                    <LinkIcon className="w-4 h-4 text-[#0066ff]" />
                  </div>

                  <div className="flex items-center gap-2 p-2.5 border border-slate-300 rounded-xl bg-white">
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="flex-1 text-xs text-slate-800 outline-none"
                      placeholder="https://example.com/product-link"
                    />
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Realistic Manychat Phone Preview (Screenshot 2) */}
        <div className="flex-1 bg-[#f4f5f7] flex flex-col items-center justify-center p-6 relative overflow-y-auto">
          {/* Phone View Selector Tabs */}
          <div className="mb-3 flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-semibold">
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

          {/* Phone Mockup Frame (Matching Screenshot 2) */}
          <div className="w-[340px] h-[670px] bg-[#101216] rounded-[46px] p-3 shadow-2xl ring-1 ring-slate-900/10 flex flex-col relative select-none">
            {/* Dynamic Island */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2" />
            </div>

            {/* Inner Phone Display */}
            <div className="flex-1 bg-white rounded-[36px] overflow-hidden flex flex-col text-slate-900 text-xs relative">
              {/* Status Bar */}
              <div className="h-8 px-6 pt-2 flex items-center justify-between text-[11px] font-semibold text-slate-900 bg-white shrink-0">
                <span>{phoneTab === 'dm' ? '4:28' : '2:04'}</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <div className="w-5 h-2.5 border border-slate-900 rounded-xs p-0.5">
                    <div className="w-full h-full bg-slate-900" />
                  </div>
                </div>
              </div>

              {/* POST VIEW (Matching Screenshot 2 dot-to-dot!) */}
              {phoneTab === 'post' && (
                <div className="flex-1 overflow-y-auto flex flex-col bg-white">
                  {/* Top Bar: < USERNAME Posts */}
                  <div className="h-9 px-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <ChevronLeft className="w-4 h-4 text-slate-800" />
                    <div className="text-center">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none truncate max-w-[180px]">
                        {activeUsername.toUpperCase()}
                      </span>
                      <span className="text-[11px] font-extrabold text-slate-900 leading-none">
                        Posts
                      </span>
                    </div>
                    <div className="w-4" />
                  </div>

                  {/* Account Header */}
                  <div className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0a180f] border border-[#c5a059] flex items-center justify-center text-[7px] font-bold text-[#c5a059] leading-none shrink-0">
                        {activeUsername.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-[11px] text-slate-900 truncate max-w-[170px]">
                        {activeUsername}
                      </span>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-slate-700" />
                  </div>

                  {/* Reel Photo / Video with Overlay (Screenshot 2) */}
                  <div className="w-full aspect-[4/4] bg-slate-900 relative overflow-hidden shrink-0">
                    <img
                      src={displayThumbnail}
                      alt="Reel Media"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80';
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2.5">
                      <span className="text-[10px] font-black text-amber-300 uppercase leading-none drop-shadow-md">
                        {activeName}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Reel Caption */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span className="text-[11px] font-semibold">{selectedItem?.likeCount || 74}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-[11px] font-semibold">{selectedItem?.commentsCount || 1}</span>
                        </div>
                        <Send className="w-4 h-4" />
                      </div>
                      <Bookmark className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-800 leading-snug whitespace-pre-line">
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

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px]">
                        PS
                      </div>
                      <div className="flex-1 bg-slate-50 p-2.5 rounded-xl text-[11px]">
                        <span className="font-bold text-slate-900 block">priya_sharma</span>
                        <span>{keywords[0] || 'PRICE'} PLEASE for this necklace??</span>
                      </div>
                    </div>

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

      {/* SHOW ALL REELS MODAL (Full Gallery with Search) */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Select Reel or Post from @{activeUsername}
                </h3>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchReelTerm}
                  onChange={(e) => setSearchReelTerm(e.target.value)}
                  placeholder="Search reels by caption or title..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Modal Grid */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {liveMedia
                  .filter((m) =>
                    (m.caption || '').toLowerCase().includes(searchReelTerm.toLowerCase())
                  )
                  .map((item) => {
                    const isSelected = selectedPostId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          handleSelectReel(item);
                          setShowAllModal(false);
                        }}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          isSelected
                            ? 'border-[#0066ff] ring-2 ring-[#0066ff]/30'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={item.thumbnailUrl || item.mediaUrl}
                          alt={item.caption || 'Reel'}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-2">
                          <div className="flex justify-end">
                            {isSelected && (
                              <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] text-white font-semibold line-clamp-2 leading-tight">
                              {item.caption || 'Instagram Reel'}
                            </p>
                            <div className="flex items-center gap-2 text-[9px] text-white/80 mt-1">
                              <span>❤️ {item.likeCount ?? 0}</span>
                              <span>💬 {item.commentsCount ?? 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                {liveMedia.length} media items loaded for @{activeUsername}
              </span>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
