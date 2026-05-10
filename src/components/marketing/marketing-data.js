import {
  Activity,
  Brain,
  Pill,
  FileText,
  ShieldCheck,
  Users,
  HeartPulse,
  TestTube2,
  ScanSearch,
  Stethoscope,
  Workflow,
  Layers3,
  Laptop2,
  Target,
  Lock,
  Server,
  BookOpenText,
  ClipboardList,
  WandSparkles,
  Leaf,
  ShieldAlert,
} from "lucide-react";

export const marketingTones = {
  lemon: { solid: "#d7f576", text: "#223000", soft: "rgba(215,245,118,0.22)" },
  lavender: { solid: "#c9bbff", text: "#23134d", soft: "rgba(201,187,255,0.24)" },
  mint: { solid: "#a8e6cf", text: "#0f4d37", soft: "rgba(168,230,207,0.24)" },
  peach: { solid: "#f7c9a3", text: "#603516", soft: "rgba(247,201,163,0.24)" },
  sky: { solid: "#9bb4ff", text: "#1d3970", soft: "rgba(155,180,255,0.24)" },
  rose: { solid: "#f28c8c", text: "#6f1f25", soft: "rgba(242,140,140,0.24)" },
  sand: { solid: "#f4e6c8", text: "#5c4a1b", soft: "rgba(244,230,200,0.4)" },
};

export const marketingNav = [
  { label: "Platform", page: "Platform" },
  { label: "Solutions", page: "Solutions" },
  { label: "Trust", page: "TrustCenter" },
  { label: "Pricing", page: "Pricing" },
  { label: "Dev Docs", page: "DevDocs" },
];

export const productModules = [
  {
    title: "Health Hub",
    body: "Vitals, medications, documents, labs, trends, and nutrition sit in one workflow so patients stop switching between disconnected tools.",
    icon: Activity,
    tone: "lemon",
  },
  {
    title: "AI Hub",
    body: "AI assistant, coach, reports, imaging, skin checks, and diet planning convert raw health records into explainable next steps.",
    icon: Brain,
    tone: "lavender",
  },
  {
    title: "Wellness Hub",
    body: "Goals, gamification, care circle coordination, and exports keep adherence and habit formation visible every day.",
    icon: Leaf,
    tone: "mint",
  },
  {
    title: "Care Hub",
    body: "Telehealth, emergency profile, ABHA, and profile management support real coordination beyond self-tracking alone.",
    icon: Stethoscope,
    tone: "peach",
  },
];

export const featureHighlights = [
  { title: "Vitals with scans and trend intelligence", icon: HeartPulse, tone: "rose" },
  { title: "Medication OCR, reminders, and interaction checks", icon: Pill, tone: "peach" },
  { title: "Document AI extraction and cross-document insight search", icon: FileText, tone: "sky" },
  { title: "Lab result workflows and abnormal signal surfacing", icon: TestTube2, tone: "mint" },
  { title: "Nutrition logs with meal-photo analysis", icon: ScanSearch, tone: "lemon" },
  { title: "Wellness goals, streaks, and AI coaching", icon: Target, tone: "lavender" },
];

export const problemBlocks = [
  {
    title: "Health data is fragmented",
    body: "Vitals live in one app, lab PDFs in another folder, prescriptions in chat threads, and medications in memory.",
    icon: Layers3,
    tone: "lavender",
  },
  {
    title: "Patients do manual translation",
    body: "People spend time interpreting lab jargon, copying values, and trying to understand whether anything changed.",
    icon: ClipboardList,
    tone: "peach",
  },
  {
    title: "Care teams work without shared context",
    body: "Family members and providers rarely see the same medication list, trend history, or AI summary at the same moment.",
    icon: Users,
    tone: "mint",
  },
];

export const trustHighlights = [
  { title: "Role-aware profile access", body: "Family and caregiver workflows are built around explicit profile switching and controlled visibility.", icon: Lock, tone: "lavender" },
  { title: "AI with clear context boundaries", body: "Assistant, reports, OCR, and imaging flows are organized by domain so each tool uses the right health context.", icon: WandSparkles, tone: "lemon" },
  { title: "Operational resilience", body: "Fallback-ready entities, route guards, and modular services keep the app usable as platform capabilities evolve.", icon: Server, tone: "sky" },
  { title: "Safety framing", body: "The product consistently positions AI as informational support rather than a replacement for medical advice.", icon: ShieldAlert, tone: "rose" },
];

export const developerPillars = [
  { title: "React + Vite application shell", body: "Single codebase with authenticated product routes and public-site routes, both powered by the same design language.", icon: Laptop2, tone: "sky" },
  { title: "Route-driven product architecture", body: "Health, AI, wellness, care, and account hubs compose feature pages behind routing and layout boundaries.", icon: Workflow, tone: "lavender" },
  { title: "Entity-first services", body: "Vitals, medications, labs, documents, goals, and nutrition flows are organized around explicit data contracts.", icon: BookOpenText, tone: "mint" },
  { title: "Frontend systemization", body: "Shared shells, page builders, overlay primitives, and themed cards reduce drift as features expand.", icon: ShieldCheck, tone: "lemon" },
];

export const rolloutStats = [
  { value: "12+", label: "Major health workflows live" },
  { value: "5 hubs", label: "Primary in-app navigation systems" },
  { value: "AI + OCR", label: "Decision-support and extraction layers" },
  { value: "Family-ready", label: "Multi-profile architecture" },
];

export const pricingTiers = [
  {
    name: "Starter",
    price: "₹0",
    period: "/month",
    tone: "mint",
    summary: "For individuals evaluating the operating model.",
    features: ["Core dashboard", "Vitals and meds basics", "Limited AI assistant", "Essential document storage", "Single-profile setup"],
  },
  {
    name: "Care Pro",
    price: "₹299",
    period: "/month",
    tone: "lemon",
    featured: true,
    summary: "For active self-management with AI and export workflows.",
    features: ["Unlimited records", "AI reports and nutrition scan", "Medication OCR", "Labs and trends", "Export and care-circle support"],
  },
  {
    name: "Family Grid",
    price: "₹599",
    period: "/month",
    tone: "lavender",
    summary: "For multi-profile family care and caregiver coordination.",
    features: ["Up to 15 profiles", "Shared care context", "Priority support", "Advanced wellness and analytics", "Emergency and telehealth readiness"],
  },
];
