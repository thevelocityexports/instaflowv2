import React, { useState } from 'react';
import {
  ChevronLeft,
  Instagram as InstagramIcon,
  Check,
  Sparkles,
  Users,
  ShoppingBag,
  Briefcase,
  GraduationCap,
  Store,
  HelpCircle,
  MessageSquare,
  Target,
  Zap,
  TrendingUp,
  Flame,
  Crown,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { InstagramAccount } from '../../shared/types';

interface ManychatOnboardingFlowProps {
  onAccountConnected: (account: InstagramAccount) => void;
  onBackToApp?: () => void;
  currentConnectedAccount?: InstagramAccount | null;
  onCompleteOnboarding?: () => void;
}

export type OnboardingStep =
  | 'step_1_channel'
  | 'step_2_connect'
  | 'step_4_success'
  | 'step_5_role'
  | 'step_6_goal'
  | 'step_7_followers'
  | 'step_8_plan';

export const ManychatOnboardingFlow: React.FC<ManychatOnboardingFlowProps> = ({
  onAccountConnected,
  onBackToApp,
  currentConnectedAccount,
  onCompleteOnboarding,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    currentConnectedAccount ? 'step_4_success' : 'step_1_channel'
  );
  const [connectedAccount, setConnectedAccount] = useState<InstagramAccount | null>(
    currentConnectedAccount || null
  );
  const [connectStatus, setConnectStatus] = useState<'idle' | 'connecting' | 'syncing' | 'connected'>('idle');
  const [syncedCount, setSyncedCount] = useState<number | null>(null);

  // Questionnaire responses state
  const [selectedRole, setSelectedRole] = useState<string>('creator');
  const [selectedGoal, setSelectedGoal] = useState<string>('comment_to_dm');
  const [selectedFollowers, setSelectedFollowers] = useState<string>('1k_10k');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('pro');

  /**
   * Initiates the Direct Instagram Login OAuth flow via Meta:
   * GET /api/instagram/connect
   */
  const handleConnectInstagram = () => {
    setConnectStatus('connecting');
    const width = 600;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    let userEmail: string | undefined;
    let userId: string | undefined;
    try {
      const stored = localStorage.getItem('instaflow_auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        userEmail = u.email;
        userId = u.id;
      }
    } catch {}

    const queryParams = new URLSearchParams();
    if (userId) queryParams.set('userId', userId);
    if (userEmail) queryParams.set('email', userEmail);
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const popup = window.open(
      `/api/instagram/connect${qs}`,
      'instagram_oauth_popup',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = `/api/instagram/connect${qs}`;
      return;
    }

    const messageListener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'INSTAGRAM_CONNECTED') {
        window.removeEventListener('message', messageListener);
        if (event.data.account) {
          const acc = event.data.account;
          setConnectedAccount(acc);
          setConnectStatus('syncing');
          const count = event.data.mediaCount || event.data.media?.length || 0;
          setSyncedCount(count);
          onAccountConnected(acc);
          
          setTimeout(() => {
            setConnectStatus('connected');
            // Advance to Step 4: Connection Success Screen
            setCurrentStep('step_4_success');
          }, 800);
        }
      }
    };
    window.addEventListener('message', messageListener);
  };

  const handleFinishOnboarding = () => {
    try {
      localStorage.setItem('instaflow_onboarding_completed', 'true');
      localStorage.setItem(
        'instaflow_onboarding_profile',
        JSON.stringify({
          role: selectedRole,
          goal: selectedGoal,
          followers: selectedFollowers,
          plan: selectedPlan,
          completedAt: new Date().toISOString(),
        })
      );
    } catch {}

    if (onCompleteOnboarding) {
      onCompleteOnboarding();
    } else if (onBackToApp) {
      onBackToApp();
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Header Stepper Indicator */}
      <div className="border-b border-slate-100 bg-white px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center text-white shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">
            instaflow
          </span>
        </div>

        {/* Progress Bar & Step Badge */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span>
              {currentStep === 'step_1_channel' && 'Step 1 of 8: Channel'}
              {currentStep === 'step_2_connect' && 'Step 2 of 8: Connect'}
              {currentStep === 'step_4_success' && 'Step 3 of 8: Connected'}
              {currentStep === 'step_5_role' && 'Step 4 of 8: Profile'}
              {currentStep === 'step_6_goal' && 'Step 5 of 8: Goals'}
              {currentStep === 'step_7_followers' && 'Step 6 of 8: Audience'}
              {currentStep === 'step_8_plan' && 'Step 7 of 8: Plan'}
            </span>
          </div>
          <div className="w-24 sm:w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0066ff] transition-all duration-300 rounded-full"
              style={{
                width:
                  currentStep === 'step_1_channel'
                    ? '15%'
                    : currentStep === 'step_2_connect'
                    ? '30%'
                    : currentStep === 'step_4_success'
                    ? '50%'
                    : currentStep === 'step_5_role'
                    ? '65%'
                    : currentStep === 'step_6_goal'
                    ? '80%'
                    : currentStep === 'step_7_followers'
                    ? '90%'
                    : '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Container (Dual Column Layout matching ManyChat experience) */}
      <div className="flex-1 flex flex-col md:flex-row w-full min-h-[calc(100vh-60px)]">
        {/* LEFT COLUMN: Brand Panel with Artwork */}
        <div className="w-full md:w-1/2 p-8 md:p-14 lg:p-20 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 bg-[#fafafa]/80">
          <div className="my-auto py-8 space-y-6 max-w-md">
            {/* STEP 1 ILLUSTRATION: Channel Selection */}
            {currentStep === 'step_1_channel' && (
              <div className="relative w-32 h-32 mx-auto sm:mx-0">
                <div className="absolute bottom-2 left-0 w-28 h-12 bg-emerald-100 rounded-2xl transform -skew-x-12 rotate-3 border-2 border-emerald-300 flex flex-wrap p-1 gap-1 overflow-hidden opacity-90 shadow-2xs">
                  <div className="w-3.5 h-3.5 bg-emerald-400/40 rounded-xs" />
                  <div className="w-3.5 h-3.5 bg-rose-300/60 rounded-xs" />
                  <div className="w-3.5 h-3.5 bg-emerald-400/40 rounded-xs" />
                  <div className="w-3.5 h-3.5 bg-emerald-500/50 rounded-xs" />
                </div>
                <div className="absolute bottom-3 left-3 w-22 h-18 bg-[#6d28d9] rounded-2xl border-2 border-slate-900 shadow-md flex items-center justify-center">
                  <div className="w-8 h-1.5 bg-slate-900 rounded-full mb-2" />
                  <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="absolute -top-1 left-2 w-10 h-8 bg-emerald-200 border-2 border-slate-900 rounded-xl flex items-center justify-center shadow-2xs animate-bounce">
                  <div className="w-4 h-1 bg-slate-800 rounded-full" />
                </div>
                <div className="absolute top-2 left-12 w-10 h-8 bg-rose-200 border-2 border-slate-900 rounded-xl flex items-center justify-center shadow-2xs animate-pulse">
                  <div className="w-4 h-1 bg-slate-800 rounded-full" />
                </div>
              </div>
            )}

            {/* STEP 2 ILLUSTRATION: Connect Screen */}
            {currentStep === 'step_2_connect' && (
              <div className="relative w-32 h-32 mx-auto sm:mx-0">
                <div className="absolute top-1 right-2 w-16 h-16 bg-pink-500 rounded-full blur-[1px] opacity-80 transform rotate-12" />
                <div className="absolute -top-2 right-4 text-pink-600 font-black text-2xl">✦</div>
                <div className="absolute bottom-2 left-2 w-24 h-24 bg-[#81d4fa] rounded-full border-3 border-slate-900 flex items-center justify-center shadow-md">
                  <div className="w-12 h-12 bg-amber-600/80 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <div className="w-5 h-5 bg-[#fafafa] rounded-full" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 ILLUSTRATION: Connected Success */}
            {currentStep === 'step_4_success' && (
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center shadow-sm">
                <Check className="w-10 h-10 stroke-[2.5]" />
              </div>
            )}

            {/* STEP 5, 6, 7 ILLUSTRATION: Questions */}
            {(currentStep === 'step_5_role' || currentStep === 'step_6_goal' || currentStep === 'step_7_followers') && (
              <div className="w-20 h-20 rounded-3xl bg-blue-100 border-2 border-blue-400 text-[#0066ff] flex items-center justify-center shadow-sm">
                <Sparkles className="w-9 h-9" />
              </div>
            )}

            {/* STEP 8 ILLUSTRATION: Plan Selection */}
            {currentStep === 'step_8_plan' && (
              <div className="w-20 h-20 rounded-3xl bg-amber-100 border-2 border-amber-400 text-amber-600 flex items-center justify-center shadow-sm">
                <Crown className="w-10 h-10" />
              </div>
            )}

            {/* Left Headline & Subtext */}
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#111827] tracking-tight leading-[1.15]">
                {currentStep === 'step_1_channel' && 'Where would you like to start?'}
                {currentStep === 'step_2_connect' && 'Connect Instagram'}
                {currentStep === 'step_4_success' && 'Your Instagram is connected!'}
                {currentStep === 'step_5_role' && 'What describes you best?'}
                {currentStep === 'step_6_goal' && 'What is your main goal?'}
                {currentStep === 'step_7_followers' && 'How large is your audience?'}
                {currentStep === 'step_8_plan' && 'Choose your growth plan'}
              </h1>
              <p className="text-sm md:text-base text-slate-500 font-normal leading-relaxed">
                {currentStep === 'step_1_channel' && "Don't worry, you can connect other channels later."}
                {currentStep === 'step_2_connect' && 'Connect your Instagram account to start building automated DMs and comment replies.'}
                {currentStep === 'step_4_success' && "Let's get your account ready with personalized automation settings."}
                {currentStep === 'step_5_role' && 'Help us tailor the experience and templates for your specific business workflow.'}
                {currentStep === 'step_6_goal' && "We'll configure your default triggers and message templates for quick results."}
                {currentStep === 'step_7_followers' && 'We optimize reply speed and smart variations based on your incoming traffic.'}
                {currentStep === 'step_8_plan' && 'Start free today, unlock unlimited volume and AI variations with Pro anytime.'}
              </p>
            </div>
          </div>

          {/* Bottom Left Navigation Link */}
          <div className="pt-4">
            {currentStep === 'step_1_channel' ? (
              onBackToApp && (
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Go to Workspace</span>
                </button>
              )
            ) : currentStep === 'step_2_connect' ? (
              <button
                type="button"
                onClick={() => setCurrentStep('step_1_channel')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Choose Another Channel</span>
              </button>
            ) : currentStep === 'step_4_success' ? (
              <button
                type="button"
                onClick={() => setCurrentStep('step_2_connect')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Reconnect Account</span>
              </button>
            ) : currentStep === 'step_5_role' ? (
              <button
                type="button"
                onClick={() => setCurrentStep('step_4_success')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : currentStep === 'step_6_goal' ? (
              <button
                type="button"
                onClick={() => setCurrentStep('step_5_role')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : currentStep === 'step_7_followers' ? (
              <button
                type="button"
                onClick={() => setCurrentStep('step_6_goal')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep('step_7_followers')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Step Experience */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-center bg-white">
          {/* ======================================================== */}
          {/* STEP 1: Social Media Channel Selection Cards */}
          {/* ======================================================== */}
          {currentStep === 'step_1_channel' && (
            <div className="w-full max-w-md mx-auto space-y-3.5 animate-in fade-in duration-200">
              {/* Instagram Card (Active Primary) */}
              <div
                onClick={() => setCurrentStep('step_2_connect')}
                className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-[#0066ff]/80 shadow-md hover:border-[#0066ff] hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-4 group ring-2 ring-[#0066ff]/10"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <InstagramIcon className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0066ff] transition-colors">
                      Instagram
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#0066ff] px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Supercharge your social media marketing with Instagram Automation.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0066ff] group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>

              {/* TikTok Card (Coming soon) */}
              <div className="p-4 sm:p-5 bg-slate-50/70 rounded-2xl border border-slate-200 opacity-75 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                  <span className="font-black text-lg">♪</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">TikTok</h3>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Elevate your marketing with TikTok's seamless automation.
                  </p>
                </div>
              </div>

              {/* WhatsApp Card (Coming soon) */}
              <div className="p-4 sm:p-5 bg-slate-50/70 rounded-2xl border border-slate-200 opacity-75 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#25d366] flex items-center justify-center text-white shrink-0">
                  <MessageSquare className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">WhatsApp</h3>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Reach a global audience on the most popular messaging app.
                  </p>
                </div>
              </div>

              {/* Facebook Messenger Card (Coming soon) */}
              <div className="p-4 sm:p-5 bg-slate-50/70 rounded-2xl border border-slate-200 opacity-75 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#0084ff] flex items-center justify-center text-white shrink-0">
                  <Zap className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">Facebook Messenger</h3>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Create Facebook Messenger automation to keep customers happy.
                  </p>
                </div>
              </div>

              {/* Telegram Card (Coming soon) */}
              <div className="p-4 sm:p-5 bg-slate-50/70 rounded-2xl border border-slate-200 opacity-75 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#229ed9] flex items-center justify-center text-white shrink-0">
                  <span className="font-bold text-lg">✈</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">Telegram</h3>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Power up your business with Telegram automation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: Connect Instagram via Meta OAuth */}
          {/* ======================================================== */}
          {currentStep === 'step_2_connect' && (
            <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in duration-200">
              <div className="p-6 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-xs">
                    <InstagramIcon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Meta Instagram API</h3>
                    <p className="text-xs text-slate-500">Official Graph API integration</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Log in with your Instagram Professional / Creator account or connected Facebook Page to allow InstaFlow to listen for comments and reply via DM.
                </p>

                <div className="space-y-2 pt-1 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Instant synchronization of active reels and posts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Safe official Meta permissions (No account credentials stored)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConnectInstagram}
                disabled={connectStatus === 'connecting' || connectStatus === 'syncing'}
                className="w-full py-4 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-80"
              >
                {connectStatus === 'idle' && (
                  <>
                    <InstagramIcon className="w-4 h-4" />
                    <span>Connect via Meta</span>
                  </>
                )}
                {connectStatus === 'connecting' && (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to Meta...</span>
                  </>
                )}
                {connectStatus === 'syncing' && (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synchronizing Instagram Reels & Posts...</span>
                  </>
                )}
                {connectStatus === 'connected' && (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Connected!</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: Connected Success Screen */}
          {/* ======================================================== */}
          {currentStep === 'step_4_success' && (
            <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in duration-200">
              {/* Instagram Account Connected Card */}
              <div className="p-6 bg-white rounded-2xl border-2 border-emerald-500/80 shadow-md space-y-4 ring-4 ring-emerald-50">
                <div className="flex items-center gap-4">
                  {/* Profile Avatar */}
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-200 bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center text-white text-lg font-bold shadow-xs shrink-0">
                    {connectedAccount?.profilePictureUrl ? (
                      <img
                        src={connectedAccount.profilePictureUrl}
                        alt={connectedAccount.username}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>
                        {(connectedAccount?.name || connectedAccount?.username || 'IG').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900 truncate">
                        {connectedAccount?.name || connectedAccount?.username || 'Instagram Account'}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      @{connectedAccount?.username || 'account'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Channel: Instagram Professional</span>
                  <span className="text-emerald-600 font-semibold">✓ Ready to Automate</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('step_5_role')}
                className="w-full py-3.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: Onboarding Question 1 - Role */}
          {/* ======================================================== */}
          {currentStep === 'step_5_role' && (
            <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2.5">
                {[
                  {
                    id: 'creator',
                    title: 'Creator / Influencer',
                    desc: 'Grow followers and send automated links when people comment on reels.',
                    icon: Sparkles,
                  },
                  {
                    id: 'ecommerce',
                    title: 'E-commerce Brand',
                    desc: 'Deliver product links, discount codes, and convert comments into sales.',
                    icon: ShoppingBag,
                  },
                  {
                    id: 'agency',
                    title: 'Digital Marketing Agency',
                    desc: 'Manage social automations and lead funnels for multiple clients.',
                    icon: Briefcase,
                  },
                  {
                    id: 'coach',
                    title: 'Coach / Consultant / Educator',
                    desc: 'Book discovery calls and distribute lead magnets automatically.',
                    icon: GraduationCap,
                  },
                  {
                    id: 'local_business',
                    title: 'Local Business / Service',
                    desc: 'Answer pricing questions, business hours, and location inquiries 24/7.',
                    icon: Store,
                  },
                  {
                    id: 'other',
                    title: 'Other',
                    desc: 'Exploring social automation for general marketing.',
                    icon: HelpCircle,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedRole === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedRole(item.id)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                        isSelected
                          ? 'border-[#0066ff] bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#0066ff] text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#0066ff] shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('step_6_goal')}
                className="w-full py-3.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 6: Onboarding Question 2 - Main Goal */}
          {/* ======================================================== */}
          {currentStep === 'step_6_goal' && (
            <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2.5">
                {[
                  {
                    id: 'comment_to_dm',
                    title: 'Auto-Send Links on Comments',
                    desc: 'When users comment "LINK" or "PRICE", automatically DM them the link.',
                    icon: MessageSquare,
                  },
                  {
                    id: 'lead_generation',
                    title: 'Capture Leads & Book Calls',
                    desc: 'Collect contact information and send Calendly / landing page links.',
                    icon: Target,
                  },
                  {
                    id: 'customer_support',
                    title: '24/7 Automated Customer Support',
                    desc: 'Answer FAQs about shipping, store hours, and product features instantly.',
                    icon: Zap,
                  },
                  {
                    id: 'grow_engagement',
                    title: 'Grow Engagement & Followers',
                    desc: 'Boost algorithmic reach with instant replies to every post comment.',
                    icon: TrendingUp,
                  },
                  {
                    id: 'product_drops',
                    title: 'Product Launches & Flash Sales',
                    desc: 'Broadcast exclusive discount codes to followers who comment on reels.',
                    icon: Flame,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedGoal === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedGoal(item.id)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                        isSelected
                          ? 'border-[#0066ff] bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#0066ff] text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#0066ff] shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('step_7_followers')}
                className="w-full py-3.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 7: Onboarding Question 3 - Followers Count */}
          {/* ======================================================== */}
          {currentStep === 'step_7_followers' && (
            <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2.5">
                {[
                  {
                    id: 'under_1k',
                    title: 'Under 1,000 followers',
                    desc: 'Just getting started with Instagram growth.',
                  },
                  {
                    id: '1k_10k',
                    title: '1,000 – 10,000 followers',
                    desc: 'Consistent audience with regular engagement on posts.',
                  },
                  {
                    id: '10k_50k',
                    title: '10,000 – 50,000 followers',
                    desc: 'Established creator or growing brand with viral reels.',
                  },
                  {
                    id: '50k_100k',
                    title: '50,000 – 100,000 followers',
                    desc: 'High-volume community with hundreds of comments per post.',
                  },
                  {
                    id: '100k_plus',
                    title: '100,000+ followers',
                    desc: 'Enterprise scale requiring high-throughput DM dispatch.',
                  },
                ].map((item) => {
                  const isSelected = selectedFollowers === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedFollowers(item.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#0066ff] bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-[#0066ff] bg-[#0066ff] text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('step_8_plan')}
                className="w-full py-3.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 8: Plan Selection Free vs Pro */}
          {/* ======================================================== */}
          {currentStep === 'step_8_plan' && (
            <div className="w-full max-w-lg mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Free Plan */}
                <div
                  onClick={() => setSelectedPlan('free')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedPlan === 'free'
                      ? 'border-[#0066ff] bg-blue-50/20 shadow-sm ring-2 ring-[#0066ff]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Free Tier</span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedPlan === 'free' ? 'border-[#0066ff] bg-[#0066ff] text-white' : 'border-slate-300'
                        }`}
                      >
                        {selectedPlan === 'free' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900">$0</span>
                      <span className="text-xs text-slate-400"> / month</span>
                    </div>
                    <ul className="space-y-2 text-[11px] text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>1 Instagram Account</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Up to 1,000 Auto-DMs / mo</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Post & Reel Comment Triggers</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan('free');
                      handleFinishOnboarding();
                    }}
                    className="w-full mt-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
                  >
                    Start with Free
                  </button>
                </div>

                {/* Pro Plan (Recommended) */}
                <div
                  onClick={() => setSelectedPlan('pro')}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                    selectedPlan === 'pro'
                      ? 'border-[#0066ff] bg-blue-50/40 shadow-md ring-2 ring-[#0066ff]/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-[#0066ff] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-bl-lg">
                    POPULAR
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#0066ff]">Pro Growth</span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedPlan === 'pro' ? 'border-[#0066ff] bg-[#0066ff] text-white' : 'border-slate-300'
                        }`}
                      >
                        {selectedPlan === 'pro' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-slate-900">$19</span>
                      <span className="text-xs text-slate-400"> / month</span>
                    </div>
                    <ul className="space-y-2 text-[11px] text-slate-700">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0066ff] shrink-0" />
                        <span className="font-semibold">Unlimited Auto-DMs</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0066ff] shrink-0" />
                        <span>Smart Anti-Spam DM Variations</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0066ff] shrink-0" />
                        <span>Priority Media Sync & Triggers</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-[#0066ff] shrink-0" />
                        <span>Lead Capture & Contact Export</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan('pro');
                      handleFinishOnboarding();
                    }}
                    className="w-full mt-5 py-2.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Start 14-Day Free Pro Trial
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  Continue to Workspace →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
