import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Moon, Sun, ArrowRight, Activity } from 'lucide-react';

export default function MarketingLayout() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 p-2 rounded-xl group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">HealthFluxi</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 font-medium">
            <Link to="/features" className="hover:text-indigo-500 transition-colors">Features</Link>
            <Link to="/problem-solution" className="hover:text-indigo-500 transition-colors">Solution</Link>
            <Link to="/pricing" className="hover:text-indigo-500 transition-colors">Pricing</Link>
            <Link to="/dev-docs" className="hover:text-indigo-500 transition-colors">Developers</Link>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              <Sun className="w-5 h-5 hidden dark:block text-slate-400" />
              <Moon className="w-5 h-5 block dark:hidden text-slate-600" />
            </button>
            <Link to="/auth/login" className="hidden sm:flex px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium items-center gap-2 transition-all">
              Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1">
        <Outlet />
      </div>

      {/* Basic Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-indigo-500" />
              <span className="font-bold">HealthFluxi</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              The next-generation health tracking platform.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><Link to="/features">Features</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><Link to="/problem-solution">About</Link></li>
              <li><Link to="/dev-docs">Developers</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}