import React, { useState } from 'react';
import {
  ChevronLeft,
  Instagram as InstagramIcon,
} from 'lucide-react';
import { InstagramAccount } from '../../shared/types';

interface ManychatOnboardingFlowProps {
  onAccountConnected: (account: InstagramAccount) => void;
  onBackToApp?: () => void;
  currentConnectedAccount?: InstagramAccount | null;
}

type OnboardingStep = 'select_channel' | 'connect_instagram';

export const ManychatOnboardingFlow: React.FC<ManychatOnboardingFlowProps> = ({
  onAccountConnected,
  onBackToApp,
  currentConnectedAccount,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('select_channel');

  /**
   * Initiates the Direct Instagram Login OAuth flow:
   * GET /api/instagram/connect
   * which redirects to:
   * https://api.instagram.com/oauth/authorize
   */
  const handleConnectInstagram = () => {
    const width = 600;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const popup = window.open(
      '/api/instagram/connect',
      'instagram_oauth_popup',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = '/api/instagram/connect';
      return;
    }

    const messageListener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'INSTAGRAM_CONNECTED') {
        window.removeEventListener('message', messageListener);
        if (event.data.account) {
          onAccountConnected(event.data.account);
          if (onBackToApp) onBackToApp();
        }
      }
    };
    window.addEventListener('message', messageListener);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Main Container (Dual Column Layout) */}
      <div className="flex-1 flex flex-col md:flex-row w-full min-h-[90vh]">
        {/* LEFT COLUMN: Brand Panel with Artwork */}
        <div className="w-full md:w-1/2 p-8 md:p-16 lg:p-24 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 bg-[#fafafa]/50">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <span className="font-black text-2xl md:text-3xl tracking-tight text-[#111827]">
              Manychat
            </span>
          </div>

          {/* Center Graphic & Headline */}
          <div className="my-auto py-12 space-y-8 max-w-md">
            {/* STEP 1 ILLUSTRATION: Toaster with 2 speech bubbles on checkered mat */}
            {currentStep === 'select_channel' && (
              <div className="relative w-36 h-36 mx-auto sm:mx-0">
                <div className="absolute bottom-2 left-0 w-32 h-14 bg-emerald-100 rounded-2xl transform -skew-x-12 rotate-3 border-2 border-emerald-300 flex flex-wrap p-1 gap-1 overflow-hidden opacity-90 shadow-sm">
                  <div className="w-4 h-4 bg-emerald-400/40 rounded-xs" />
                  <div className="w-4 h-4 bg-rose-300/60 rounded-xs" />
                  <div className="w-4 h-4 bg-emerald-400/40 rounded-xs" />
                  <div className="w-4 h-4 bg-emerald-500/50 rounded-xs" />
                  <div className="w-4 h-4 bg-rose-300/60 rounded-xs" />
                  <div className="w-4 h-4 bg-emerald-400/40 rounded-xs" />
                </div>

                <div className="absolute bottom-4 left-4 w-24 h-20 bg-[#6d28d9] rounded-2xl border-3 border-slate-900 shadow-md flex items-center justify-center">
                  <div className="w-10 h-1.5 bg-slate-900 rounded-full mb-3" />
                  <div className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full bg-emerald-400 border border-slate-900" />
                  <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-pink-400" />
                </div>

                <div className="absolute -top-1 left-2 w-12 h-10 bg-emerald-200 border-2 border-slate-900 rounded-2xl rounded-bl-xs flex items-center justify-center shadow-xs animate-bounce">
                  <div className="w-5 h-1 bg-slate-800 rounded-full" />
                </div>
                <div className="absolute top-2 left-14 w-12 h-10 bg-rose-200 border-2 border-slate-900 rounded-2xl rounded-br-xs flex items-center justify-center shadow-xs animate-pulse">
                  <div className="w-5 h-1 bg-slate-800 rounded-full" />
                </div>
              </div>
            )}

            {/* STEP 2 ILLUSTRATION: Donut ring with starburst rays */}
            {currentStep === 'connect_instagram' && (
              <div className="relative w-36 h-36 mx-auto sm:mx-0">
                <div className="absolute top-1 right-2 w-20 h-20 bg-pink-500 rounded-full blur-[1px] opacity-90 transform rotate-12 clip-path-polygon" />
                <div className="absolute -top-3 right-6 text-pink-600 font-black text-3xl">✦</div>

                <div className="absolute bottom-2 left-2 w-28 h-28 bg-[#81d4fa] rounded-full border-4 border-slate-900 flex items-center justify-center shadow-md">
                  <div className="w-14 h-14 bg-amber-700/80 rounded-full border-3 border-slate-900 flex items-center justify-center">
                    <div className="w-6 h-6 bg-[#fafafa] rounded-full" />
                  </div>
                </div>

                <div className="absolute bottom-0 right-2 w-10 h-8 bg-pink-500 rounded-xl border-2 border-slate-900 rounded-bl-xs shadow-xs" />
              </div>
            )}

            {/* Headline Text */}
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight leading-[1.15]">
                {currentStep === 'select_channel' ? 'Where would you like to start?' : 'Instagram'}
              </h1>
              <p className="text-sm md:text-base text-slate-500 font-normal leading-relaxed">
                {currentStep === 'select_channel'
                  ? "Don't worry, you can connect other channels later."
                  : 'Connect your Instagram account to use Instagram automation.'}
              </p>
            </div>
          </div>

          {/* Bottom Left Navigation Link */}
          <div className="pt-6">
            {currentStep === 'select_channel' ? (
              onBackToApp && (
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Dashboard</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep('select_channel')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Choose Another Channel</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Channel Cards or Connect Screen */}
        <div className="w-full md:w-1/2 p-6 sm:p-12 lg:p-20 flex flex-col justify-center bg-white">
          {/* CURRENTLY CONNECTED ACCOUNT STATUS CARD */}
          {currentConnectedAccount && (
            <div className="w-full max-w-md mx-auto mb-6 p-4 bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#0a180f] border-2 border-emerald-500 flex items-center justify-center text-xs font-bold text-[#c5a059] shrink-0">
                    {currentConnectedAccount.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-extrabold text-slate-900">
                        @{currentConnectedAccount.username}
                      </h4>
                      <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[9px] font-bold rounded">
                        CONNECTED
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      {currentConnectedAccount.name || 'Instagram Account'}
                    </p>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="pt-1 flex items-center gap-2">
                {onBackToApp && (
                  <button
                    type="button"
                    onClick={onBackToApp}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs text-center cursor-pointer"
                  >
                    Open Automation Builder →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SCREEN 1: Social Media Channel Selection Cards */}
          {currentStep === 'select_channel' && (
            <div className="w-full max-w-md mx-auto space-y-4">
              {/* Instagram Card (Primary & Active) */}
              <div
                onClick={() => setCurrentStep('connect_instagram')}
                className="p-5 bg-white rounded-2xl border-2 border-[#e5e7eb] hover:border-[#0066ff] hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <div className="flex-1">
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
              </div>

              {/* TikTok Card */}
              <div
                onClick={() => setCurrentStep('connect_instagram')}
                className="p-5 bg-white rounded-2xl border border-[#e5e7eb] hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#000000] flex items-center justify-center text-white shrink-0">
                  <span className="font-black text-lg">♪</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">TikTok</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Elevate your marketing with TikTok's seamless automation.
                  </p>
                </div>
              </div>

              {/* WhatsApp Card */}
              <div
                onClick={() => setCurrentStep('connect_instagram')}
                className="p-5 bg-white rounded-2xl border border-[#e5e7eb] hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#25d366] flex items-center justify-center text-white shrink-0">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.043.072.043.419-.101.824z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">WhatsApp</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Reach a global audience on the most popular messaging app.
                  </p>
                </div>
              </div>

              {/* Facebook Messenger Card */}
              <div
                onClick={() => setCurrentStep('connect_instagram')}
                className="p-5 bg-white rounded-2xl border border-[#e5e7eb] hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0084ff] flex items-center justify-center text-white shrink-0">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.527 3.735 7.205V22l3.39-1.86c.91.252 1.875.389 2.875.389 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.07 12.448l-2.735-2.915-5.335 2.915 5.865-6.223 2.805 2.915 5.265-2.915-5.865 6.223z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">Facebook Messenger</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Create Facebook Messenger automation to keep customers happy.
                  </p>
                </div>
              </div>

              {/* Telegram Card */}
              <div
                onClick={() => setCurrentStep('connect_instagram')}
                className="p-5 bg-white rounded-2xl border border-[#e5e7eb] hover:border-slate-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#229ed9] flex items-center justify-center text-white shrink-0">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.61 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 4-1.74 6.67-2.89 8.02-3.45 3.82-1.58 4.62-1.85 5.14-1.86.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.19-.04.36z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">Telegram</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Power up your business with Telegram automation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: Connect Instagram (Simplified Single Connection Experience) */}
          {currentStep === 'connect_instagram' && (
            <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">Instagram</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Connect your Instagram account to use Instagram automation.
                </p>
              </div>

              <button
                type="button"
                onClick={handleConnectInstagram}
                className="w-full py-3.5 bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <InstagramIcon className="w-4 h-4" />
                <span>Connect Instagram</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
