import React, { useState } from 'react';
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

// Sample Post data matching Screenshot 2 & 4
const POST_OPTIONS = [
  {
    id: 'post_bangles_reel_99',
    tag: 'PAIR BANGLES',
    badge: '10% Discount',
    title: 'Pair Bangles Collection',
    caption:
      'vajramakutajewellers This festive season, adorn your celebrations with the elegance of a beautiful pair bangles from Vajramukuta Pancha Loha Jewellers. 💛✨ A symbol of tradition, love and timeless beauty — pair bangles collection brings together classic designs and beautiful craftsmanship for your special occasions. 🙏✨\nFestive Season • Timeless Tradition • Beautiful Jewellery ✨\n📍 Dilsukhnagar Branch Metro Pillar No. A1511 & A1519, Beside Karnataka Bank, Gaddiannaram, Dilsukhnagar, Hyderabad – 500060\n📞 96420 64207 📍 KPHB Branch MIG...',
    likes: 151,
    comments: 1,
    imageUrl: 'https://images.unsplash.com/photo-1611591475879-114c004d80a1?auto=format&fit=crop&w=600&q=80',
    overlayText: 'PAIR BANGLES',
  },
  {
    id: 'post_discount_reel_88',
    tag: 'FESTIVE OFFER',
    badge: '10% Discount',
    title: 'Festive Season Jewellery',
    caption:
      'vajramakutajewellers Special 10% Discount across our entire bridal & antique collection. Comment PRICE to get the catalog!',
    likes: 248,
    comments: 12,
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
    overlayText: '10% DISCOUNT',
  },
  {
    id: 'post_hand_bangles_77',
    tag: 'GOLD BANGLES',
    badge: 'NEW',
    title: 'Bangles on Hand',
    caption:
      'vajramakutajewellers Handcrafted 22K pure gold finish bangles for auspicious moments. DM or comment LINK.',
    likes: 189,
    comments: 8,
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80',
    overlayText: 'BANGLES',
  },
  {
    id: 'post_store_reel_66',
    tag: 'STORE VISIT',
    badge: 'HYDERABAD',
    title: 'Showroom Collection',
    caption:
      'vajramakutajewellers Visit our Hyderabad showroom at Dilsukhnagar & KPHB to explore exclusive bridal ornaments.',
    likes: 312,
    comments: 29,
    imageUrl: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=600&q=80',
    overlayText: 'SHOP NOW',
  },
];

export const AutomationBuilder: React.FC<AutomationBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
  connectedAccountUsername = 'vajramakutajewellers',
}) => {
  // Top level tab: 'Insights' or 'Preview' (Matching Screenshot 1 & 5)
  const [topTab, setTopTab] = useState<'insights' | 'preview'>('preview');

  // Name
  const [name, setName] = useState(initialData?.name || 'Auto-DM links from comments');

  // Step 1: When someone comments on
  const [targetPostType, setTargetPostType] = useState<'specific' | 'all' | 'next'>(
    (initialData?.targetPostType as any) || 'specific'
  );
  const [selectedPostId, setSelectedPostId] = useState<string>(
    initialData?.targetPostId || POST_OPTIONS[0].id
  );

  // Step 2: And this comment has
  const [hasKeywordMode, setHasKeywordMode] = useState<'specific' | 'any'>('specific');
  const [keywords, setKeywords] = useState<string[]>(
    initialData?.keywords || ['Price', 'Link', 'Shop', 'Cost']
  );
  const [keywordInput, setKeywordInput] = useState('');

  // Step 3: Reply to their comments under the post
  const existingPublicReply = initialData?.actions?.find((a) => a.actionType === 'public_reply');
  const [enablePublicReply, setEnablePublicReply] = useState(
    existingPublicReply ? existingPublicReply.isEnabled : false
  );
  const [publicReplyText, setPublicReplyText] = useState(
    existingPublicReply?.messageTemplate || 'Thanks for your interest! 👋 Check your DM for details.'
  );

  // Step 4: "They will get"
  const existingPrivateDM = initialData?.actions?.find((a) => a.actionType === 'private_dm');
  const [enableOpeningDM, setEnableOpeningDM] = useState(true);
  const [openingDMText, setOpeningDMText] = useState(
    "Hey there! I'm so happy you're here, thanks so much for your interest 😊\n\nClick below and I'll send you the link in just a sec ✨"
  );
  const [openingDMButtonText, setOpeningDMButtonText] = useState('Send me the link');

  const [askFollowBeforeLink, setAskFollowBeforeLink] = useState(false);
  const [askEmail, setAskEmail] = useState(false);

  // Step 5: "And then, they will get"
  const [enableLinkDM, setEnableLinkDM] = useState(true);
  const [linkDMText, setLinkDMText] = useState(
    existingPrivateDM?.messageTemplate ||
      `✨ **Black Beads Bracelet** ✨\n\nElegant Black Beads Bracelet with a simple and stylish design, perfect for everyday wear and traditional looks. 🖤✨\n\n📦 **Available for Order**\n💬 Reply **'ORDER'** to know the price and details.\n🛍️ Check the link below to order online:\n\n📞 **For Orders & Enquiries:**\n9642064207`
  );
  const [linkButtonText, setLinkButtonText] = useState(
    existingPrivateDM?.linkButtonText || 'Order Now'
  );
  const [linkUrl, setLinkUrl] = useState(
    existingPrivateDM?.linkUrl || 'https://vajramakutajewellers.com/products/black-beads-bracelet'
  );
  const [followUpIfNotClicked, setFollowUpIfNotClicked] = useState(false);

  // Phone preview tabs: 'post' | 'comments' | 'dm' (Matching Screenshot 1 & 4)
  const [phoneTab, setPhoneTab] = useState<'post' | 'comments' | 'dm'>('post');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPost = POST_OPTIONS.find((p) => p.id === selectedPostId) || POST_OPTIONS[0];

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
        targetPostType: targetPostType === 'specific' ? 'specific' : 'all',
        targetPostId: targetPostType === 'specific' ? selectedPostId : undefined,
        targetPostCaption: targetPostType === 'specific' ? selectedPost.caption : undefined,
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
      {/* Top Header Bar (Matching Screenshot 1 & 5) */}
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

        {/* Center: Insights & Preview Tabs (Underlined active state) */}
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

        {/* Right: Actions (Cancel, Update, Edit, Stop) */}
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
              'Update'
            )}
          </button>
          <button
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Dual-Column Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Scrollable Automation Configuration Form */}
        <div className="w-full lg:w-[480px] xl:w-[520px] overflow-y-auto p-6 space-y-6 border-r border-[#e5e7eb] bg-white">
          {/* Section 1: When someone comments on */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[#111827] tracking-tight">
              When someone comments on
            </h3>

            {/* Specific post card with 4 thumbnails */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                targetPostType === 'specific'
                  ? 'border-[#0066ff] bg-[#f8fbff]/60'
                  : 'border-[#e5e7eb] hover:border-slate-300'
              }`}
            >
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

              {/* 4 Post Thumbnails side-by-side (Matching Screenshot 2) */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {POST_OPTIONS.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => {
                      setTargetPostType('specific');
                      setSelectedPostId(post.id);
                    }}
                    className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      selectedPostId === post.id && targetPostType === 'specific'
                        ? 'border-[#0066ff] ring-2 ring-[#0066ff]/20'
                        : 'border-transparent hover:opacity-90'
                    }`}
                  >
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-1.5">
                      <span className="text-[9px] font-black text-amber-300 uppercase leading-none drop-shadow-md">
                        {post.overlayText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setPhoneTab('post')}
                  className="text-xs font-semibold text-[#0066ff] hover:underline"
                >
                  Show All
                </button>
              </div>
            </div>

            {/* Any post or reel */}
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

            {/* Next post or reel */}
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

            {/* Public reply toggle card (Matching Screenshot 2 & 3) */}
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

          {/* Section 3: "They will get" (Matching Screenshot 3 & 4) */}
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
                      rows={4}
                      className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed outline-none focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]"
                    />
                    <span className="absolute bottom-2 right-3 text-[11px] text-slate-400">
                      {1000 - openingDMText.length}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={openingDMButtonText}
                    onChange={(e) => setOpeningDMButtonText(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0066ff]"
                    placeholder="Button text"
                  />

                  <p className="text-xs text-[#0066ff] hover:underline cursor-pointer flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Why does an Opening DM matter?
                  </p>
                </div>
              )}
            </div>

            {/* A DM asking to follow you before they get the link */}
            <div className="p-3.5 rounded-xl border border-[#e5e7eb] flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 max-w-[280px]">
                a DM asking to follow you before they get the link
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={askFollowBeforeLink}
                  onChange={(e) => setAskFollowBeforeLink(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0066ff]"></div>
              </label>
            </div>

            {/* A DM asking for their email */}
            <div className="p-3.5 rounded-xl border border-[#e5e7eb] flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                a DM asking for their email
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={askEmail}
                  onChange={(e) => setAskEmail(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0066ff]"></div>
              </label>
            </div>
          </div>

          {/* Section 4: "And then, they will get" (Matching Screenshot 1) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-[#111827] tracking-tight">
              And then, they will get
            </h3>

            {/* A DM with a link card */}
            <div className="p-4 rounded-xl border border-[#e5e7eb] space-y-3">
              <span className="text-sm font-semibold text-slate-900 block">
                a DM with a link
              </span>

              <div className="relative">
                <textarea
                  value={linkDMText}
                  onChange={(e) => setLinkDMText(e.target.value)}
                  rows={8}
                  className="w-full p-3 border border-[#0066ff] ring-1 ring-[#0066ff] rounded-xl text-xs text-slate-800 leading-relaxed outline-none"
                  placeholder="Write a message"
                />
                <span className="absolute bottom-2 right-3 text-[11px] text-slate-400">
                  {696}
                </span>
              </div>

              {/* Link button row with Link icon */}
              <div className="flex items-center gap-2 p-2.5 border border-slate-300 rounded-xl bg-white">
                <input
                  type="text"
                  value={linkButtonText}
                  onChange={(e) => setLinkButtonText(e.target.value)}
                  className="flex-1 text-xs text-slate-800 font-medium outline-none"
                  placeholder="Order Now"
                />
                <LinkIcon className="w-4 h-4 text-[#0066ff]" />
              </div>

              <button
                type="button"
                className="w-full py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>+ Add A Link</span>
              </button>
            </div>

            {/* Follow up DM if they don't click the link */}
            <div className="p-3.5 rounded-xl border border-[#e5e7eb] flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 max-w-[280px]">
                a follow up DM if they don't click the link
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={followUpIfNotClicked}
                  onChange={(e) => setFollowUpIfNotClicked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0066ff]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Phone Preview or Insights Tab */}
        <div className="flex-1 bg-[#f4f5f7] flex flex-col items-center justify-center p-6 relative overflow-y-auto">
          {topTab === 'insights' ? (
            /* INSIGHTS VIEW (Matching Screenshot 5 dot-to-dot!) */
            <div className="w-full max-w-2xl space-y-6 self-start p-4">
              {/* Best things to do next Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Best things to do next
                </h3>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded-full border border-slate-300 bg-white text-slate-500 hover:bg-slate-100">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 rounded-full border border-slate-300 bg-white text-slate-500 hover:bg-slate-100">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Recommendation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded shadow-2xs">
                      SECRET
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Respond to all your DMs</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Auto-send customized replies when people DM you
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                    <Heart className="w-6 h-6 fill-pink-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Boost clicks on your link</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      A quick follow-up increases clicks by 36% on average
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Metrics Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1 text-slate-900 font-bold text-sm">
                  <span>Key metrics</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Sends', value: '14', hasArrow: true },
                    { label: 'Clicks', value: '5', hasArrow: true },
                    { label: 'CTR', value: '36%', hasArrow: false },
                    { label: 'Emails', value: '0', hasArrow: false },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>{metric.label}</span>
                        {metric.hasArrow && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                      <p className="text-2xl font-bold text-slate-900 font-sans">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW VIEW: Realistic Phone Mockup (Matching Screenshot 1 & 2 dot-to-dot!) */
            <div className="flex flex-col items-center justify-center">
              {/* Phone Mockup Frame */}
              <div className="w-[330px] h-[640px] bg-[#101216] rounded-[44px] p-3 shadow-2xl ring-1 ring-slate-900/10 flex flex-col relative select-none">
                {/* iPhone Dynamic Island */}
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

                  {/* Phone Screen Tab 1: POSTS VIEW (Matching Screenshot 2 & 4 dot-to-dot!) */}
                  {phoneTab === 'post' && (
                    <div className="flex-1 overflow-y-auto flex flex-col bg-white">
                      {/* Top Bar */}
                      <div className="h-9 px-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <ChevronLeft className="w-4 h-4 text-slate-800" />
                        <div className="text-center">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block leading-none">
                            VAJRAMAKUTAJEWELLERS
                          </span>
                          <span className="text-[11px] font-extrabold text-slate-900 leading-none">
                            Posts
                          </span>
                        </div>
                        <div className="w-4" />
                      </div>

                      {/* Post Account Info Header */}
                      <div className="p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0a180f] border border-[#c5a059] flex items-center justify-center text-[6px] font-bold text-[#c5a059] leading-none shrink-0">
                            VM
                          </div>
                          <span className="font-bold text-[11px] text-slate-900">
                            vajramakutajewellers
                          </span>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-slate-700" />
                      </div>

                      {/* Post Photo Container with PAIR BANGLES overlay (Matching Screenshot 2) */}
                      <div className="w-full aspect-[4/4] bg-slate-900 relative overflow-hidden shrink-0">
                        <img
                          src={selectedPost.imageUrl}
                          alt={selectedPost.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3">
                          <h2 className="text-lg font-black text-amber-300 uppercase tracking-wide drop-shadow-md">
                            {selectedPost.overlayText}
                          </h2>
                        </div>
                      </div>

                      {/* Engagement Bar */}
                      <div className="p-2.5 flex items-center justify-between text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4 text-slate-900" />
                            <span className="text-[10px] font-bold">{selectedPost.likes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4 text-slate-900" />
                            <span className="text-[10px] font-bold">{selectedPost.comments}</span>
                          </div>
                          <Send className="w-4 h-4 text-slate-900" />
                        </div>
                        <Bookmark className="w-4 h-4 text-slate-900" />
                      </div>

                      {/* Caption text */}
                      <div className="px-2.5 pb-2 text-[10px] space-y-1 text-slate-800 leading-tight">
                        <p>
                          <span className="font-bold mr-1">vajramakutajewellers</span>
                          {selectedPost.caption}
                        </p>
                      </div>

                      {/* Instagram Bottom Nav Icons */}
                      <div className="mt-auto h-10 border-t border-slate-100 flex items-center justify-around bg-white text-slate-800 shrink-0">
                        <Home className="w-4 h-4" />
                        <Search className="w-4 h-4" />
                        <Clapperboard className="w-4 h-4" />
                        <Heart className="w-4 h-4" />
                        <div className="w-4 h-4 rounded-full bg-slate-300" />
                      </div>
                    </div>
                  )}

                  {/* Phone Screen Tab 2: COMMENTS VIEW */}
                  {phoneTab === 'comments' && (
                    <div className="flex-1 overflow-y-auto flex flex-col bg-white">
                      <div className="h-9 px-3 border-b border-slate-100 flex items-center gap-2 bg-white shrink-0">
                        <ChevronLeft className="w-4 h-4 text-slate-800" />
                        <span className="text-xs font-bold text-slate-900">Comments</span>
                      </div>

                      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                        {/* User Comment Trigger */}
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[9px] text-slate-700 shrink-0">
                            PS
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <span className="font-bold text-[11px] text-slate-900 mr-1.5">
                              priya_sharma
                            </span>
                            <p className="text-slate-800 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100 inline-block">
                              {keywords[0] || 'PRICE'} PLEASE!
                            </p>
                            <div className="flex items-center gap-2 text-[9px] text-slate-400 pt-0.5">
                              <span>2m</span>
                              <span className="text-[#0066ff] font-semibold">Matched Keyword</span>
                            </div>
                          </div>
                        </div>

                        {/* Automated Public Reply (Nested) */}
                        {enablePublicReply ? (
                          <div className="ml-6 pl-3 border-l-2 border-slate-200 flex items-start gap-2">
                            <div className="w-5 h-5 rounded-full bg-[#0a180f] border border-[#c5a059] flex items-center justify-center text-[6px] font-bold text-[#c5a059] shrink-0">
                              VM
                            </div>
                            <div className="flex-1 space-y-0.5">
                              <span className="font-bold text-[11px] text-slate-900 mr-1.5">
                                vajramakutajewellers
                              </span>
                              <p className="text-slate-800 text-[11px] bg-slate-100 p-2 rounded-xl border border-slate-200 inline-block">
                                {publicReplyText}
                              </p>
                              <span className="block text-[9px] text-emerald-600 font-medium">
                                ✓ Automated Public Reply
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="ml-6 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500">
                            Public Comment Reply is off.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Phone Screen Tab 3: DIRECT MESSAGE (DM) VIEW (Matching Screenshot 1 dot-to-dot!) */}
                  {phoneTab === 'dm' && (
                    <div className="flex-1 overflow-y-auto flex flex-col bg-[#121418] text-white">
                      {/* DM Top Bar Header */}
                      <div className="h-11 px-3 border-b border-slate-800/80 flex items-center justify-between bg-[#121418] shrink-0">
                        <div className="flex items-center gap-2">
                          <ChevronLeft className="w-4 h-4 text-white" />
                          <div className="w-6 h-6 rounded-full bg-[#0a180f] border border-[#c5a059] flex items-center justify-center text-[6px] font-bold text-[#c5a059] shrink-0">
                            VM
                          </div>
                          <span className="font-bold text-[11px] text-white truncate max-w-[130px]">
                            vajramakutajewellers
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-white">
                          <Phone className="w-3.5 h-3.5" />
                          <Video className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Message Thread */}
                      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                        {/* Optional Opening DM Bubble */}
                        {enableOpeningDM && (
                          <div className="flex items-end gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#0a180f] border border-[#c5a059] flex items-center justify-center text-[5px] font-bold text-[#c5a059] shrink-0">
                              VM
                            </div>
                            <div className="max-w-[240px] space-y-2">
                              <div className="bg-[#1e2025] text-slate-100 p-3 rounded-2xl rounded-bl-xs text-[11px] leading-relaxed whitespace-pre-wrap shadow-xs">
                                {openingDMText}
                              </div>
                              <button
                                type="button"
                                className="w-full py-2 bg-[#2d3139] hover:bg-[#373c46] text-white text-xs font-semibold rounded-xl text-center shadow-xs transition-colors"
                              >
                                {openingDMButtonText}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Main DM with Link Bubble (Matching Screenshot 1 dot-to-dot!) */}
                        <div className="flex items-end gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#0a180f] border border-[#c5a059] flex items-center justify-center text-[5px] font-bold text-[#c5a059] shrink-0">
                            VM
                          </div>
                          <div className="max-w-[240px] space-y-2">
                            <div className="bg-[#1e2025] text-slate-100 p-3 rounded-2xl rounded-bl-xs text-[11px] leading-relaxed whitespace-pre-wrap shadow-xs">
                              {linkDMText}
                            </div>
                            <button
                              type="button"
                              className="w-full py-2 bg-[#2d3139] hover:bg-[#373c46] text-white text-xs font-semibold rounded-xl text-center shadow-xs transition-colors"
                            >
                              {linkButtonText}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Instagram Bottom Chat Bar (Matching Screenshot 1) */}
                      <div className="h-12 border-t border-slate-800/80 px-2.5 flex items-center justify-between bg-[#121418] shrink-0 text-slate-400">
                        <div className="w-6 h-6 rounded-full bg-[#0066ff] flex items-center justify-center text-white shrink-0">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 mx-2 bg-[#1e2025] rounded-full px-3 py-1 text-[11px] text-slate-400">
                          Message...
                        </div>
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          <Smile className="w-4 h-4" />
                          <PlusCircle className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Segmented Bottom Preview Switcher (Matching Screenshot 3 & 4: [ Post ] [ Comments ] [ DM ]) */}
              <div className="mt-4 flex items-center bg-white border border-[#d1d5db] rounded-full p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPhoneTab('post')}
                  className={`px-4 py-1 rounded-full text-xs font-semibold transition-all ${
                    phoneTab === 'post'
                      ? 'bg-slate-100 text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Post
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneTab('comments')}
                  className={`px-4 py-1 rounded-full text-xs font-semibold transition-all ${
                    phoneTab === 'comments'
                      ? 'bg-slate-100 text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Comments
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneTab('dm')}
                  className={`px-4 py-1 rounded-full text-xs font-semibold transition-all ${
                    phoneTab === 'dm'
                      ? 'bg-slate-100 text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  DM
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
