import type { Metadata, Viewport } from "next";
import { Noto_Serif, Outfit } from "next/font/google";
import "./globals.css";
import ShellToolbar from "@/components/ShellToolbar";
import PwaRegistry from "@/components/PwaRegistry";
import AIBrain from "@/components/AIBrain";
import ProfilePanel from "@/components/profile/ProfilePanel";
import { Toaster } from "sonner";

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import CookieConsent from '@/components/CookieConsent';
import FooterWrapper from '@/components/FooterWrapper';
import GlobalFooter from '@/components/GlobalFooter';

const notoSerif = Noto_Serif({ 
  subsets: ["latin"], 
  variable: "--font-noto-serif", 
  weight: ['400', '700'],
  display: "swap" 
});
const outfit = Outfit({ 
  subsets: ["latin"], 
  variable: "--font-outfit", 
  display: "swap" 
});

export const metadata: Metadata = {
  title: "Yatra | Premium Travel Intelligence",
  description: "Your professional personal Travel Guide. Discover trains, flights, hotels and elite experiences across India.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yatra",
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
      </head>
      <body className={`${notoSerif.variable} ${outfit.variable} font-sans`} suppressHydrationWarning>
        <PwaRegistry />
        <AuthProvider>
        <LanguageProvider>
          <ShellToolbar />
          <ProfilePanel />
          
          <LayoutTransitions>
            {children}
          </LayoutTransitions>

        <FooterWrapper>
          <GlobalFooter />
        </FooterWrapper>
        <AIBrain />
        <CookieConsent />
        <Toaster position="top-center" richColors theme="dark" />
        </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
