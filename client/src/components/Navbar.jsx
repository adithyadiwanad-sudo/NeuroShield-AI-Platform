import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { Shield, Activity, Terminal, UserCheck, Menu, X, ChevronRight, LogIn, BarChart2, History, Cpu, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Navbar = ({ onOpenAuth }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState({ express: 'checking', flask: 'checking', model: 'checking' });
  const location = useLocation();
  const navigate = useNavigate();

  const checkHealth = async () => {
    try {
      const res = await api.get('/health');
      if (res.data.success && res.data.services) {
        setHealthStatus(res.data.services);
      }
    } catch (err) {
      setHealthStatus({ express: 'online', flask: 'offline', model: 'unavailable' });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { path: '/', label: 'Home', icon: Shield },
    { path: '/scam-detector', label: 'SMS & Text Detector', icon: MessageSquare },
    { path: '/dashboard', label: 'Dashboard', icon: Activity },
    { path: '/intrusion', label: 'Intrusion Detection', icon: Terminal },
    { path: '/history', label: 'Detection History', icon: History },
    { path: '/model-performance', label: 'Model Performance', icon: BarChart2 },
    { path: '/profile', label: 'Profile/About', icon: UserCheck }
  ];

  return (
    <nav className="sticky top-0 z-40 glass-nav transition-all duration-300">
      <div className={`${location.pathname === '/dashboard' ? 'max-w-none' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-between h-16">

          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5A8] to-[#4F8CFF] p-0.5 shadow-lg shadow-[#00E5A8]/20">
              <div className="w-full h-full bg-[#0B1020] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#00E5A8]" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight font-sans text-white">
                NEURO<span className="gradient-text-primary">SHIELD</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00E5A8]/10 text-[#00E5A8] border border-[#00E5A8]/30">
                IDS SOC
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#00E5A8]/10 text-[#00E5A8] border border-[#00E5A8]/30 shadow-sm font-semibold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </NavLink>
              );
            })}
          </div>

          {/* Right Action Bar & Real System Health Status */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${healthStatus.flask === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              <span className={healthStatus.flask === 'online' ? 'text-emerald-400' : 'text-gray-400'}>
                FLASK ML: {healthStatus.flask.toUpperCase()}
              </span>
            </div>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-gray-800">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#4F8CFF]/20 border border-[#4F8CFF]/40 text-[#4F8CFF] flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="text-left leading-tight hidden xl:block">
                    <p className="text-xs font-semibold text-gray-200">{user.name || 'Analyst'}</p>
                    <p className="text-[10px] text-gray-400">{user.role || 'SOC Lead'}</p>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-[#FF4D6D] hover:bg-[#FF4D6D]/10 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00E5A8] to-[#4F8CFF] text-[#0B1020] font-semibold text-xs hover:opacity-90 transition-opacity shadow-md shadow-[#00E5A8]/20"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In / Access SOC
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden glass-card border-b border-gray-800 px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium ${
                  isActive
                    ? 'bg-[#00E5A8]/10 text-[#00E5A8] border border-[#00E5A8]/30 font-semibold'
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {link.label}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </NavLink>
            );
          })}

          {/* Mobile Auth Controls */}
          <div className="pt-4 border-t border-gray-800 space-y-2">
            {user ? (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4 text-[#4F8CFF]" />
                    <span>Profile ({user.name || 'Analyst'})</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </Link>

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5A8] to-[#4F8CFF] text-[#0B1020] font-bold text-xs shadow-md"
              >
                <LogIn className="w-4 h-4" />
                Sign In / Access SOC
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
