'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, FileText, AlertTriangle, Scale, ChevronRight, ArrowLeft, ExternalLink, Mail, Phone } from 'lucide-react';

const LAST_UPDATED = '07 April 2026';
const EFFECTIVE_DATE = '07 April 2026';
const PLATFORM_NAME = 'Yatra';
const PLATFORM_URL = 'https://yatra.ai';
const GRIEVANCE_EMAIL = 'support@yatra.ai';
const GRIEVANCE_PHONE = '+91 1800-YATRA';

type Tab = 'privacy' | 'terms' | 'disclaimer' | 'refund';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'privacy',     label: 'Privacy Policy',    icon: Shield },
  { id: 'terms',       label: 'Terms of Service',  icon: FileText },
  { id: 'disclaimer',  label: 'Disclaimer',        icon: AlertTriangle },
  { id: 'refund',      label: 'Refund Policy',     icon: Scale },
];

// ── Shared section heading ───────────────────────────────────────────────────
function SectionHead({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-3 text-base font-black text-white mt-10 mb-3 pt-6 border-t border-zinc-800">
      <span className="w-7 h-7 bg-cyan-600/10 border border-cyan-500/20 rounded-lg flex items-center justify-center text-xs font-black text-cyan-400">
        {n}
      </span>
      {title}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-400 leading-relaxed mt-2">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-zinc-400 mt-1.5">
      <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// PRIVACY POLICY  (DPDP Act 2023 + IT SPDI Rules 2011 + IT Act 2000)
// ───────────────────────────────────────────────────────────────────────────
function PrivacyPolicy() {
  return (
    <div>
      <div className="bg-cyan-600/5 border border-cyan-500/20 rounded-2xl p-5 mb-6">
        <p className="text-[11px] font-black text-cyan-400 uppercase tracking-widest">Governing Law</p>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          This Privacy Policy is governed by and compliant with:
          <strong className="text-zinc-200 block mt-1">
            Digital Personal Data Protection Act, 2023 (DPDP Act) · Information Technology Act, 2000
            · IT (Amendment) Act, 2008 · IT (Reasonable Security Practices and Procedures and
            Sensitive Personal Data or Information) Rules, 2011 · Consumer Protection Act, 2019
          </strong>
        </p>
      </div>

      <SectionHead n={1} title="Data Fiduciary Identity" />
      <P>
        <strong className="text-zinc-200">{PLATFORM_NAME}</strong> ("{PLATFORM_URL}") operates as the
        <strong className="text-zinc-200"> Data Fiduciary</strong> as defined under Section 2(i) of the
        Digital Personal Data Protection Act, 2023. We determine the purpose and means of processing of
        personal data collected through this platform.
      </P>
      <P>
        The platform is an <strong className="text-zinc-200">intermediary</strong> under Section 2(1)(w)
        of the IT Act, 2000. We do not directly provide travel services — we aggregate real-time data from
        government APIs (IRCTC), airlines, and authorised hospitality providers.
      </P>

      <SectionHead n={2} title="Data Collected & Purpose" />
      <P>We collect <strong className="text-zinc-200">only data strictly necessary</strong> for the purposes stated below (data minimisation principle — DPDP Act, Section 6):</P>
      <ul className="mt-3 space-y-0.5">
        <Li><strong className="text-zinc-200">Identity Data:</strong> Full name, email address, mobile number — for account creation and booking confirmation.</Li>
        <Li><strong className="text-zinc-200">Booking Data:</strong> Origin, destination, travel dates, passenger details — to generate AI itineraries and process reservations.</Li>
        <Li><strong className="text-zinc-200">Payment Data:</strong> All payment transactions are processed exclusively by <strong>Razorpay</strong> (a PCI DSS Level 1 certified processor). We do NOT store card numbers, CVV, or UPI PINs on our servers.</Li>
        <Li><strong className="text-zinc-200">Device & Session Data:</strong> IP address, browser type, session tokens — for fraud prevention and security auditing as required under IT (SPDI) Rules 2011, Rule 8.</Li>
        <Li><strong className="text-zinc-200">AI Chat Data:</strong> Messages sent to the AI Brain — stored for 90 days to improve response quality. Anonymised after 90 days.</Li>
      </ul>

      <SectionHead n={3} title="Sensitive Personal Data or Information (SPDI)" />
      <P>
        Under IT (SPDI) Rules 2011, the following categories are treated as Sensitive Personal Data:
      </P>
      <ul className="mt-3 space-y-0.5">
        <Li>Aadhaar number (collected only for IRCTC passenger verification, stored encrypted, never transmitted in plaintext)</Li>
        <Li>Passport number (for international bookings, if applicable)</Li>
        <Li>Financial information used to process transactions (handled entirely via Razorpay)</Li>
      </ul>
      <P>We obtain <strong className="text-zinc-200">explicit written consent</strong> before collecting SPDI as mandated by Rule 5(1) of IT (SPDI) Rules 2011.</P>

      <SectionHead n={4} title="Your Rights Under DPDP Act, 2023" />
      <ul className="mt-3 space-y-0.5">
        <Li><strong className="text-zinc-200">Right to Access (Sec 11):</strong> Request a summary of your personal data and processing activities.</Li>
        <Li><strong className="text-zinc-200">Right to Correction (Sec 12):</strong> Request correction of inaccurate or incomplete personal data.</Li>
        <Li><strong className="text-zinc-200">Right to Erasure (Sec 12):</strong> Request deletion of your data where it is no longer necessary for the stated purpose.</Li>
        <Li><strong className="text-zinc-200">Right to Grieve (Sec 13):</strong> Register a complaint with our Grievance Officer (details in Section 9).</Li>
        <Li><strong className="text-zinc-200">Right to Nominate (Sec 14):</strong> Nominate a person who may exercise these rights in case of your incapacity or death.</Li>
        <Li><strong className="text-zinc-200">Right to Withdraw Consent (Sec 7):</strong> You may withdraw consent at any time. Withdrawal will not affect the lawfulness of processing done before withdrawal.</Li>
      </ul>
      <P>To exercise any right, email <a href={`mailto:${GRIEVANCE_EMAIL}`} className="text-cyan-400 hover:underline">{GRIEVANCE_EMAIL}</a> with subject: <em>"DPDP Rights Request — [Your Name]"</em>. We will respond within <strong className="text-zinc-200">30 days</strong> as required by law.</P>

      <SectionHead n={5} title="Data Retention" />
      <P>We retain personal data only as long as necessary, or as required by applicable law:</P>
      <ul className="mt-3 space-y-0.5">
        <Li>Account data: Until account deletion + 7 years (GST / tax audit requirements)</Li>
        <Li>Booking records: 7 years from booking date (Consumer Protection Act, 2019)</Li>
        <Li>AI chat history: 90 days in identifiable form, then anonymised indefinitely</Li>
        <Li>Payment logs: 8 years (PMLA / RBI guidelines)</Li>
      </ul>

      <SectionHead n={6} title="Data Localisation" />
      <P>
        In compliance with Indian data sovereignty requirements, all personal data of Indian citizens is
        stored on servers located <strong className="text-zinc-200">within India</strong>. Our database
        provider (Supabase) operates through AWS ap-south-1 (Mumbai) region. No personal data is
        transferred outside India without your explicit consent.
      </P>

      <SectionHead n={7} title="Security Practices" />
      <P>As required by IT (SPDI) Rules 2011, Rule 8, we maintain:</P>
      <ul className="mt-3 space-y-0.5">
        <Li>256-bit AES encryption for data at rest</Li>
        <Li>TLS 1.3 for all data in transit</Li>
        <Li>Role-based access control (RBAC) for database access</Li>
        <Li>Automated intrusion detection and rate limiting</Li>
        <Li>Regular security audits by independent third-party assessors</Li>
        <Li>No storage of passwords in plaintext — bcrypt hashing via Supabase Auth</Li>
      </ul>

      <SectionHead n={8} title="Third-Party Services & Disclosures" />
      <P>We integrate with the following third parties. Each maintains their own privacy policies:</P>
      <ul className="mt-3 space-y-0.5">
        <Li>Razorpay Payments Private Limited (PCI DSS compliant payment processor)</Li>
        <Li>IRCTC API (Indian Railway Catering and Tourism Corporation)</Li>
        <Li>Google Sign-In (OAuth 2.0 — no password shared with us)</Li>
        <Li>Google Gemini API (AI response generation — prompts anonymised)</Li>
        <Li>Supabase Inc. (Database and authentication infrastructure)</Li>
      </ul>
      <P>We do <strong className="text-zinc-200">NOT</strong> sell, rent, or trade your personal data with advertisers, data brokers, or any third party for commercial purposes.</P>

      <SectionHead n={9} title="Grievance Officer" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-3 space-y-2">
        <p className="text-xs font-black text-white">Appointed under IT (SPDI) Rules 2011, Rule 5(9) & DPDP Act 2023, Section 13</p>
        <p className="text-xs text-zinc-400">Name: <strong className="text-zinc-200">Yatra Grievance Cell</strong></p>
        <p className="text-xs text-zinc-400">Email: <a href={`mailto:${GRIEVANCE_EMAIL}`} className="text-cyan-400 hover:underline">{GRIEVANCE_EMAIL}</a></p>
        <p className="text-xs text-zinc-400">Phone: <strong className="text-zinc-200">{GRIEVANCE_PHONE}</strong> (Mon–Sat, 9AM–6PM IST)</p>
        <p className="text-xs text-zinc-400">Response time: <strong className="text-zinc-200">Within 30 days of receipt</strong></p>
        <p className="text-[10px] text-zinc-600 mt-2">If your complaint is not resolved to your satisfaction, you may approach the <strong className="text-zinc-500">Data Protection Board of India</strong> once constituted under Section 18 of the DPDP Act, 2023.</p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// TERMS OF SERVICE
// ───────────────────────────────────────────────────────────────────────────
function TermsOfService() {
  return (
    <div>
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-6">
        <p className="text-xs text-amber-300 font-black uppercase tracking-widest mb-1">Platform Nature</p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Yatra is an <strong className="text-zinc-200">AI-powered travel aggregation and planning platform</strong>.
          We are NOT a travel agent, tour operator, airline, railway booking agent, or hotel.
          We act as a technology intermediary that displays publicly available travel data and facilitates bookings
          through authorised third-party providers.
        </p>
      </div>

      <SectionHead n={1} title="Acceptance of Terms" />
      <P>By accessing or using {PLATFORM_NAME}, you confirm that you have read, understood, and agree to be bound by these Terms of Service, our Privacy Policy, and our Disclaimer. If you do not agree, do not use this platform.</P>
      <P>These Terms constitute a legally binding agreement between you (<strong className="text-zinc-200">"User"</strong>) and the operator of {PLATFORM_NAME} (<strong className="text-zinc-200">"Platform"</strong>, "we", "us").</P>

      <SectionHead n={2} title="Eligibility" />
      <ul className="mt-3 space-y-0.5">
        <Li>You must be at least 18 years of age to create an account and make bookings independently.</Li>
        <Li>Minors may use the platform only under direct supervision of a parent or legal guardian who accepts these Terms on their behalf.</Li>
        <Li>By registering, you affirm you have the legal capacity to enter into a binding contract under the Indian Contract Act, 1872.</Li>
      </ul>

      <SectionHead n={3} title="Platform as Intermediary" />
      <P>Under Section 2(1)(w) of the Information Technology Act, 2000 and the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021:</P>
      <ul className="mt-3 space-y-0.5">
        <Li>Yatra is an <strong className="text-zinc-200">intermediary</strong> and is not the seller, service provider, or agent for any travel service.</Li>
        <Li>All bookings are transactions directly between you and the respective carrier (railway/airline/hotel).</Li>
        <Li>Yatra exercises no editorial control over third-party pricing, availability, cancellation policies, or service quality.</Li>
        <Li>We comply with and cooperate fully with law enforcement agencies as required under the IT Act, 2000.</Li>
      </ul>

      <SectionHead n={4} title="AI-Generated Content" />
      <P>Our platform uses artificial intelligence (Google Gemini) to generate travel recommendations, itineraries, and chat responses. You acknowledge that:</P>
      <ul className="mt-3 space-y-0.5">
        <Li>AI-generated content is <strong className="text-zinc-200">advisory and informational only</strong> — it is not a professional travel advisory service.</Li>
        <Li>AI recommendations may not reflect real-time availability, current visa regulations, or live safety conditions.</Li>
        <Li>You are solely responsible for verifying critical information (entry requirements, health advisories, political conditions) from official government sources before travel.</Li>
        <Li>The platform operator is not liable for reliance on AI-generated content.</Li>
      </ul>

      <SectionHead n={5} title="Payment Terms" />
      <ul className="mt-3 space-y-0.5">
        <Li>All payments are processed by Razorpay. By proceeding with payment, you also agree to Razorpay's Terms of Service.</Li>
        <Li>The Platform displays estimated prices sourced from third-party APIs. <strong className="text-zinc-200">Final prices are confirmed only at the time of payment processing</strong> (see our Price Verification system).</Li>
        <Li>GST/applicable taxes are included in displayed prices unless explicitly stated otherwise.</Li>
        <Li>The Platform charges no hidden markup or service fee beyond what is shown on the payment screen.</Li>
        <Li>In case of payment disputes with third-party providers, the Platform will act as a facilitator but is not a party to the financial transaction.</Li>
      </ul>

      <SectionHead n={6} title="Prohibited Conduct" />
      <P>The following are expressly prohibited under these Terms and applicable law:</P>
      <ul className="mt-3 space-y-0.5">
        <Li>Submitting false passenger identity or government ID information (violates IT Act, IPC sections on fraud)</Li>
        <Li>Using the platform for bulk or commercial ticket touting (violates Railway Act, 1989)</Li>
        <Li>Any attempt to manipulate, scrape, or reverse-engineer our AI systems</Li>
        <Li>Impersonating government officials, railway staff, or airline personnel</Li>
        <Li>Using the platform for any unlawful purpose under Indian or international law</Li>
      </ul>

      <SectionHead n={7} title="Intellectual Property" />
      <P>All content, software, AI models, brand assets, and design elements on {PLATFORM_NAME} are the intellectual property of the Platform or its licensors, protected under the Copyright Act, 1957 and the Trade Marks Act, 1999. Unauthorised reproduction or distribution is prohibited.</P>

      <SectionHead n={8} title="Governing Law & Dispute Resolution" />
      <P>These Terms shall be governed by the laws of <strong className="text-zinc-200">India</strong>. Any disputes arising shall first be submitted to the Platform's Grievance Officer. If unresolved, disputes shall be subject to <strong className="text-zinc-200">mandatory arbitration</strong> under the Arbitration and Conciliation Act, 1996, with arbitration seated in <strong className="text-zinc-200">Bengaluru, Karnataka</strong>. Courts in Bengaluru shall have exclusive jurisdiction for non-arbitrable matters.</P>
      <P>For consumer disputes, you retain rights under the Consumer Protection Act, 2019 and may approach the relevant District Consumer Disputes Redressal Commission.</P>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// DISCLAIMER  (No-liability clause)
// ───────────────────────────────────────────────────────────────────────────
function Disclaimer() {
  return (
    <div>
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 mb-6">
        <p className="text-xs text-red-300 font-black uppercase tracking-widest mb-1">Important — Please Read Carefully</p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          This disclaimer limits the legal liability of the Platform operator to the maximum extent
          permitted under Indian law. Nothing in this disclaimer seeks to exclude liability for
          <strong className="text-zinc-200"> death or personal injury caused by our negligence</strong> or
          <strong className="text-zinc-200"> fraud or fraudulent misrepresentation</strong>.
        </p>
      </div>

      <SectionHead n={1} title="No Endorsement of Third-Party Services" />
      <P>The display of train schedules, flight prices, hotel listings, and taxi options on this platform does NOT constitute an endorsement, recommendation, or guarantee of quality of those services by the Platform. All such information is sourced from third-party APIs and is provided "as is".</P>

      <SectionHead n={2} title="Price Accuracy Disclaimer" />
      <P>Travel prices are volatile and change in real-time. Prices displayed on Yatra are:</P>
      <ul className="mt-3 space-y-0.5">
        <Li><strong className="text-zinc-200">Indicative estimates</strong> sourced from third-party APIs at the time of query — not guaranteed prices.</Li>
        <Li>Subject to change between the time of display and payment. Our Price Verification system alerts you to changes before payment, but cannot guarantee price parity at the moment of carrier-side confirmation.</Li>
        <Li>In INR inclusive of base fare. Taxes, dynamic surcharges, or carrier fees may be added at checkout by the third-party provider.</Li>
      </ul>
      <P>The Platform operator accepts <strong className="text-zinc-200">no liability for any price difference</strong> between the displayed estimate and the final amount charged by the carrier or service provider.</P>

      <SectionHead n={3} title="AI Content Disclaimer" />
      <P>The AI Brain feature of Yatra generates responses using large language model technology. The Platform expressly disclaims:</P>
      <ul className="mt-3 space-y-0.5">
        <Li>Accuracy, completeness, or currency of AI-generated travel advice</Li>
        <Li>Any loss arising from following AI-generated itineraries, route suggestions, or destination recommendations</Li>
        <Li>Liability for AI hallucinations, factual errors, or incorrect regulatory information</Li>
      </ul>
      <P>AI output should be independently verified with official sources: IRCTC.co.in, airline websites, Ministry of External Affairs (for travel advisories), and state tourism departments.</P>

      <SectionHead n={4} title="Limitation of Liability (No Strings to Platform Operator)" />
      <P>To the fullest extent permissible under Indian law, the Platform operator shall NOT be liable for:</P>
      <ul className="mt-3 space-y-0.5">
        <Li><strong className="text-zinc-200">Service failures</strong> by IRCTC, airlines, hotels, taxi operators, or any third-party provider displayed on this platform.</Li>
        <Li><strong className="text-zinc-200">Train/flight delays, cancellations, or route changes</strong> by the respective transport provider.</Li>
        <Li><strong className="text-zinc-200">Hotel quality, hygiene, amenities, or safety conditions</strong> not matching descriptions provided by the hotel or OTA API.</Li>
        <Li><strong className="text-zinc-200">Force majeure events</strong> — strikes, natural disasters, public health emergencies, government orders, war, or civil unrest affecting travel.</Li>
        <Li><strong className="text-zinc-200">Loss of data, profits, or opportunity</strong> arising from platform downtime, API failures, or technical errors.</Li>
        <Li><strong className="text-zinc-200">Personal property loss, injury, or death</strong> suffered during travel arranged through the platform.</Li>
        <Li><strong className="text-zinc-200">Visa or immigration rejections</strong> arising from reliance on AI-generated travel advice.</Li>
      </ul>
      <P>In any circumstance where the Platform is found liable, the total aggregate liability shall not exceed the <strong className="text-zinc-200">net booking fee paid to the Platform</strong> (excluding amounts paid directly to carriers) for the specific transaction giving rise to the claim.</P>

      <SectionHead n={5} title="Indemnification" />
      <P>You agree to indemnify, defend, and hold harmless the Platform operator, its affiliates, officers, employees, and agents from any claim, liability, damage, or expense (including reasonable legal fees) arising from:</P>
      <ul className="mt-3 space-y-0.5">
        <Li>Your violation of these Terms or applicable law</Li>
        <Li>Submission of false identity or travel documentation</Li>
        <Li>Misuse of the AI features or the platform in general</Li>
      </ul>

      <SectionHead n={6} title="Government & Regulatory Compliance" />
      <P>The Platform complies fully with applicable Indian law including but not limited to:</P>
      <ul className="mt-3 space-y-0.5">
        <Li>Information Technology Act, 2000 & IT (Amendment) Act, 2008</Li>
        <Li>IT (Intermediary Guidelines & Digital Media Ethics Code) Rules, 2021</Li>
        <Li>Digital Personal Data Protection Act, 2023</Li>
        <Li>Consumer Protection Act, 2019 & Consumer Protection (E-Commerce) Rules, 2020</Li>
        <Li>Prevention of Money Laundering Act, 2002 (for high-value transactions)</Li>
        <Li>Railways Act, 1989 (for IRCTC-sourced rail content)</Li>
      </ul>

      <SectionHead n={7} title="Modifications to Disclaimer" />
      <P>The Platform reserves the right to modify this Disclaimer at any time. Material changes will be notified via email or an in-app notice at least <strong className="text-zinc-200">15 days before</strong> the change takes effect. Continued use after the effective date constitutes acceptance.</P>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// REFUND POLICY
// ───────────────────────────────────────────────────────────────────────────
function RefundPolicy() {
  return (
    <div>
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 mb-6">
        <p className="text-xs text-emerald-300 font-black uppercase tracking-widest mb-1">Key Principle</p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Refunds for travel bookings are governed by the cancellation policies of the respective
          carrier or service provider (IRCTC, airline, hotel). Yatra will act as a facilitator
          for refund requests but does not control the amount or timeline of refunds from third parties.
        </p>
      </div>

      <SectionHead n={1} title="Platform Service Fee" />
      <P>Any convenience or platform service fee charged by Yatra (displayed separately on the checkout screen) is <strong className="text-zinc-200">non-refundable</strong> upon cancellation of a successful booking, except where cancellation is caused by the Platform's own technical failure.</P>

      <SectionHead n={2} title="IRCTC / Train Ticket Refunds" />
      <ul className="mt-3 space-y-0.5">
        <Li>Governed entirely by IRCTC's Refund Rules under the Railways Act, 1989.</Li>
        <Li>Standard TDR (Ticket Deposit Receipt) rules apply — cancellation charges depend on time before departure.</Li>
        <Li>Tatkal bookings: No refund on confirmed Tatkal tickets except in case of train cancellation.</Li>
        <Li>Refunds credited to original payment source within <strong className="text-zinc-200">5–7 business days</strong> after IRCTC processes the request.</Li>
      </ul>

      <SectionHead n={3} title="Flight Ticket Refunds" />
      <ul className="mt-3 space-y-0.5">
        <Li>Subject to the fare rules of the airline (non-refundable, partially refundable, or fully refundable fares).</Li>
        <Li>Airline-initiated cancellations entitle you to a full refund or free rebooking as per DGCA circular.</Li>
        <Li>Processing time: 7–10 business days after airline confirmation.</Li>
      </ul>

      <SectionHead n={4} title="Hotel Refunds" />
      <ul className="mt-3 space-y-0.5">
        <Li>Subject to the individual hotel's cancellation policy shown at checkout.</Li>
        <Li>Free cancellation windows vary — typically 24–72 hours before check-in.</Li>
        <Li>No-show bookings are generally non-refundable.</Li>
      </ul>

      <SectionHead n={5} title="Platform-Error Refunds" />
      <P>If a booking fails due to a <strong className="text-zinc-200">proven Platform technical error</strong> (duplicate charge, payment processed but booking not created), a <strong className="text-zinc-200">full refund</strong> will be issued within <strong className="text-zinc-200">3 business days</strong>. Report to <a href={`mailto:${GRIEVANCE_EMAIL}`} className="text-cyan-400 hover:underline">{GRIEVANCE_EMAIL}</a> with your payment receipt and booking reference.</P>

      <SectionHead n={6} title="How to Request a Refund" />
      <ul className="mt-3 space-y-0.5">
        <Li>Go to <strong className="text-zinc-200">My Bookings → Select Booking → Cancel</strong></Li>
        <Li>Or email {GRIEVANCE_EMAIL} with subject: <em>"Refund Request — [Booking Ref / YAI-XXXXXX]"</em></Li>
        <Li>Attach: proof of payment (screenshot or transaction ID)</Li>
        <Li>Our team will acknowledge within <strong className="text-zinc-200">2 business days</strong> and relay the request to the provider.</Li>
      </ul>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// PAGE WRAPPER
// ───────────────────────────────────────────────────────────────────────────
function LegalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('privacy');

  useEffect(() => {
    const tab = searchParams.get('tab') as Tab;
    if (tab && TABS.find(t => t.id === tab)) setActiveTab(tab);
  }, [searchParams]);

  const tabContent: Record<Tab, React.ReactNode> = {
    privacy:    <PrivacyPolicy />,
    terms:      <TermsOfService />,
    disclaimer: <Disclaimer />,
    refund:     <RefundPolicy />,
  };

  return (
    <div className="max-w-4xl mx-auto pt-4 pb-20 space-y-8">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
            <Scale className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Legal Center</h1>
            <p className="text-xs text-zinc-500">Compliant with Indian IT Law · Last updated {LAST_UPDATED}</p>
          </div>
        </div>

        {/* Quick metadata */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'DPDP Act 2023', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' },
            { label: 'IT Act 2000', color: 'text-violet-400 border-violet-500/30 bg-violet-500/5' },
            { label: 'SPDI Rules 2011', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
            { label: 'Consumer Protection Act 2019', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
          ].map(b => (
            <span key={b.label} className={`text-[9px] font-black px-2.5 py-1 border rounded-full uppercase tracking-wide ${b.color}`}>
              {b.label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all
              ${activeTab === id
                ? 'bg-cyan-600/10 border-cyan-500/40 text-cyan-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content Panel */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8"
      >
        {/* Effective date banner */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-zinc-600">
            Effective: <strong className="text-zinc-500">{EFFECTIVE_DATE}</strong>
          </p>
          <a
            href={`${PLATFORM_URL}/legal?tab=${activeTab}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Permalink <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        {tabContent[activeTab]}

        {/* Contact bar */}
        <div className="mt-12 pt-6 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href={`mailto:${GRIEVANCE_EMAIL}`} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all group">
            <Mail className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Grievance Email</p>
              <p className="text-xs font-bold text-white">{GRIEVANCE_EMAIL}</p>
            </div>
          </a>
          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
            <Phone className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Grievance Helpline</p>
              <p className="text-xs font-bold text-white">{GRIEVANCE_PHONE} · Mon–Sat, 9AM–6PM IST</p>
            </div>
          </div>
        </div>
      </motion.div>

      <p className="text-[10px] text-zinc-700 text-center leading-relaxed">
        These documents have been prepared in good faith for compliance with applicable Indian law as of the effective date.
        They do not constitute legal advice. For legal counsel, consult a qualified advocate.
      </p>
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>}>
      <LegalContent />
    </Suspense>
  );
}
