import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  Activity, ArrowRight, Brain, FileText, Heart, 
  Pill, ShieldAlert, Sparkles, TrendingUp, Zap, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/* --- Shared Animation Variants --- */
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

/* --- 1. Hero Section with Parallax --- */
const HeroSection = ({ isAuthenticated }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-indigo-950/30 dark:to-purple-950/30 pt-20">
      <motion.div style={{ y: y1, opacity }} className="relative z-10 w-full max-w-7xl mx-auto px-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: "backOut" }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-md border border-indigo-100 dark:border-indigo-800/50 mb-8 shadow-sm">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">The Future of Personal Health Tracking is Here</span>
        </motion.div>
        
        <motion.h1 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
          Your Health Data, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-pink-500">Beautifully Connected</span>
        </motion.h1>
        
        <motion.p initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
          HealthFluxi eliminates the chaos of scattered medical records, tangled vital logs, and forgotten medications. Experience predictive AI insights wrapped in a stunning, seamless dashboard.
        </motion.p>
        
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard" className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 group">
              Go to Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <button onClick={() => base44.auth.redirectToLogin('/onboarding')} className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 group">
              Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          <Link to="/solutions" className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold transition-all shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95">
            See the Solution
          </Link>
        </motion.div>
      </motion.div>

      {/* Floating Parallax Elements */}
      <motion.div style={{ y: y2 }} className="absolute hidden lg:flex top-32 left-20 w-24 h-24 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-2xl items-center justify-center rotate-12">
        <Heart className="w-10 h-10 text-pink-500 drop-shadow-md" />
      </motion.div>
      <motion.div style={{ y: y1 }} className="absolute hidden lg:flex bottom-40 right-24 w-32 h-32 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-full border border-white/50 dark:border-white/10 shadow-2xl items-center justify-center -rotate-12">
        <Brain className="w-12 h-12 text-indigo-500 drop-shadow-md" />
      </motion.div>
    </section>
  );
};

/* --- 2. Problem vs Solution Section --- */
const ProblemSolutionSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={staggerContainer} initial="hidden" animate={isInView ? "visible" : "hidden"} className="grid md:grid-cols-2 gap-12 items-center">
          
          <motion.div variants={fadeUp} className="group relative p-1 lg:p-2 rounded-3xl bg-gradient-to-br from-red-100 to-orange-50 dark:from-red-950/30 dark:to-orange-950/10">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 lg:p-10 rounded-2xl h-full border border-red-100 dark:border-red-900/30">
              <ShieldAlert className="w-12 h-12 text-red-500 mb-6" />
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">The Old Way is Broken</h3>
              <ul className="space-y-4">
                {["Scattered paper records & lab results", "Missing medication doses", "Disjointed vitals tracking in 5 apps", "No intelligent correlations"].map((text, i) => (
                  <li key={i} className="flex items-start text-slate-600 dark:text-slate-400">
                    <span className="mr-3 text-red-400 mt-1">✗</span> {text}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="group relative p-1 lg:p-2 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/10 hover:-translate-y-2 transition-transform duration-500">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 lg:p-10 rounded-2xl h-full border border-teal-100 dark:border-teal-900/30 shadow-xl shadow-teal-500/10">
              <Zap className="w-12 h-12 text-teal-500 mb-6" />
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">The HealthFluxi Solution</h3>
              <ul className="space-y-4">
                {["Centralized, instant document AI scanning", "Smart medication adherence & alerts", "Unified sync with wearables", "Proactive AI health coaching"].map((text, i) => (
                  <li key={i} className="flex items-start text-slate-600 dark:text-slate-400">
                    <span className="mr-3 text-teal-500 mt-1">✓</span> {text}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link to="/problem-solution" className="text-teal-600 dark:text-teal-400 font-medium flex items-center hover:text-teal-700 transition-colors">
                  Explore how we fix it <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};

/* --- 3. Interactive Features Bento Box --- */
const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    { title: "AI Health Coach", desc: "Get real-time insights based on your vitals, labs, and habits.", icon: Brain, color: "from-indigo-400 to-purple-400", colSpan: "md:col-span-2" },
    { title: "Smart Documents", desc: "Drop any lab report. We extract the data.", icon: FileText, color: "from-blue-400 to-cyan-400", colSpan: "md:col-span-1" },
    { title: "Vital Tracking", desc: "Sync effortlessly with Apple Health & Google Fit.", icon: Activity, color: "from-emerald-400 to-teal-400", colSpan: "md:col-span-1" },
    { title: "Medication Manager", desc: "Never miss a dose with our predictive refill alerts.", icon: Pill, color: "from-rose-400 to-orange-400", colSpan: "md:col-span-2" },
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 px-6">
      <div className="max-w-7xl mx-auto" ref={ref}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Everything You Need. <span className="text-purple-500">In One App.</span></h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">Discover all modules packed into the most beautiful dashboard.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              className={`p-1 rounded-3xl bg-gradient-to-br ${feature.color} ${feature.colSpan} cursor-pointer group`}
            >
              <div className="bg-white dark:bg-slate-900 h-full w-full rounded-[22px] p-8 flex flex-col justify-between transition-colors group-hover:bg-white/90 dark:group-hover:bg-slate-900/90">
                <div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </div>
                <div className="mt-8 flex justify-end">
                  <Link to="/features" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* --- 4. Developer & API Section (Teaser) --- */
const DevelopersSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50 to-transparent dark:from-blue-900/10 -z-10" />
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="w-full lg:w-1/2">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="space-y-6">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
              For Developers
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">Build upon our Health Core.</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-600 dark:text-slate-400">
              Integrate the HealthFluxi AI models and unified data schema directly into your own patient portals and clinical systems. Full API documentation, webhooks, and Convex integration guides available.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link to="/dev-docs" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 hover:gap-3 transition-all">
                Read the Docs <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
        <div className="w-full lg:w-1/2">
          <motion.div 
            initial={{ opacity: 0, x: 50, rotateY: -10 }} 
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="perspective-[1000px]"
          >
            <div className="bg-slate-950 p-6 rounded-2xl shadow-2xl border border-slate-800 shadow-blue-500/20 font-mono text-sm text-blue-300 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <pre>
                <code>
{`async function analyzeHealthData(vitals) {
  const insight = await api.aiHealthChat({
    context: vitals.history,
    prompt: "Any anomalies today?"
  });
  
  if (insight.anomalyDetected) {
     triggerWarning(insight.patientId);
  }
  return insight;
}`}
                </code>
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* --- 5. Giant Final CTA --- */
const CTASection = ({ isAuthenticated }) => {
  return (
    <section className="py-32 px-6 bg-slate-900 dark:bg-slate-950 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-purple-500/30 blur-[128px] rounded-full -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-indigo-500/30 blur-[128px] rounded-full -translate-y-1/2"></div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <TrendingUp className="w-16 h-16 text-white/80 mx-auto mb-8" />
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-8 tracking-tight">Ready to take control?</h2>
          <p className="text-xl text-purple-200 mb-12 max-w-2xl mx-auto">
            Join thousands of users tracking vitals, medications, and unlocking AI-driven health insights every single day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard" className="px-8 py-4 rounded-2xl tracking-wide bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-lg shadow-xl hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all active:scale-95">
                Go to Dashboard
              </Link>
            ) : (
              <button onClick={() => base44.auth.redirectToLogin('/onboarding')} className="px-8 py-4 rounded-2xl tracking-wide bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-lg shadow-xl hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all active:scale-95">
                Get Started Free
              </button>
            )}
            <Link to="/pricing" className="px-8 py-4 rounded-2xl tracking-wide bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 text-white font-bold text-lg transition-all active:scale-95">
              View Pricing
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* --- Main Home Page Assembly --- */
export default function MarketingHome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-indigo-200 selection:text-indigo-900">
      <main>
        <HeroSection isAuthenticated={isAuthenticated} />
        <ProblemSolutionSection />
        <FeaturesSection />
        <DevelopersSection />
        <CTASection isAuthenticated={isAuthenticated} />
      </main>
    </div>
  );
}