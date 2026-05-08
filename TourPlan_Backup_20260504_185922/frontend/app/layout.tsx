import type { Metadata, Viewport } from "next";
import { Noto_Serif, Inter } from "next/font/google";
import "./globals.css";
import ShellToolbar from "@/components/ShellToolbar";
import PwaRegistry from "@/components/PwaRegistry";
import AIBrain from "@/components/AIBrain";
import { Toaster } from "sonner";

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import CookieConsent from '@/components/CookieConsent';

const notoSerif = Noto_Serif({ 
  subsets: ["latin"], 
  variable: "--font-noto-serif", 
  weight: ['400', '700'],
  display: "swap" 
});
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter", 
  display: "swap" 
});

export const metadata: Metadata = {
  title: "TourPlan | Premium Travel Intelligence",
  description: "Your AI-powered personal travel architect. Discover trains, flights, hotels and elite experiences across the globe.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TourPlan",
    startupImage: [{ url: '/icon-192.png' }],
  },
  icons: {
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#fdfdfb",
};

import LayoutTransitions from "@/components/LayoutTransitions";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body className={`${notoSerif.variable} ${inter.variable} font-sans`} suppressHydrationWarning>
        <PwaRegistry />
        <AuthProvider>
        <LanguageProvider>
          <ShellToolbar />
          
          <LayoutTransitions>
            {children}
          </LayoutTransitions>

        <footer className="border-t border-white/5 bg-[#020617] py-14 relative z-10">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 text-sm text-zinc-500">
            <div className="space-y-4">
              <div className="text-white font-semibold text-lg tracking-tight flex items-center gap-2">
                TOUR<span className="text-cyan-400">PLAN</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">Redefining global travel with the precision of AI and the heart of a storyteller.</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['DPDP Act 2023', 'IT Act 2000', 'PCI DSS'].map(b => (
                  <span key={b} className="text-[11px] font-medium px-2 py-0.5 bg-white/5 border border-white/5 rounded-full text-zinc-500">{b}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-xs tracking-wide uppercase">Ecosystem</h4>
              <ul className="space-y-2.5 text-xs">
                <li className="hover:text-cyan-400 cursor-pointer transition-colors">Global Discovery</li>
                <li className="hover:text-cyan-400 cursor-pointer transition-colors">Corporate Access</li>
                <li className="hover:text-cyan-400 cursor-pointer transition-colors">API Framework</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-xs tracking-wide uppercase">Intelligence</h4>
              <ul className="space-y-2.5 text-xs">
                <li className="hover:text-cyan-400 cursor-pointer transition-colors">Safety Engine</li>
                <li className="hover:text-cyan-400 cursor-pointer transition-colors">Ground Logistics</li>
                <li className="hover:text-cyan-400 cursor-pointer transition-colors">Help Center ↗</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-xs tracking-wide uppercase">Legal</h4>
              <ul className="space-y-2.5 text-xs">
                <li><a href="/legal?tab=privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
                <li><a href="/legal?tab=terms" className="hover:text-cyan-400 transition-colors">Terms of Service</a></li>
                <li><a href="/legal?tab=disclaimer" className="hover:text-cyan-400 transition-colors">Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-white/5 max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-zinc-600 text-xs">© 2026 TourPlan Intelligence Platform</p>
            <p className="text-zinc-700 text-xs text-center leading-relaxed max-w-md">
              TourPlan is an intermediary platform. Services powered by third-party carriers.
            </p>
          </div>
        </footer>
        <AIBrain />
        <CookieConsent />
        <Toaster position="top-center" richColors theme="dark" />
        </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
