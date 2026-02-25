import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        if (!name.trim()) {
          toast.error('Please enter your name');
          setLoading(false);
          return;
        }
        await signup(email, password, name);
        toast.success('Account created! Awaiting admin approval.');
      } else {
        await login(email, password);
        toast.success('Logged in successfully!');
      }
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      const msg =
        error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential'
          ? 'No account found. Please Sign Up first.'
          : error.code === 'auth/wrong-password'
          ? 'Incorrect password'
          : error.code === 'auth/email-already-in-use'
          ? 'Email already registered. Please login.'
          : error.code === 'auth/weak-password'
          ? 'Password must be at least 6 characters'
          : error.code === 'auth/invalid-email'
          ? 'Invalid email address'
          : error.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">MEDHA Command Center</h1>
              <p className="text-blue-300 text-sm">Real-Time Event Control & Verification</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isSignup ? 'Create Account' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                  {isSignup ? 'Creating Account...' : 'Signing In...'}
                </span>
              ) : (
                isSignup ? 'Sign Up' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-blue-300 hover:text-blue-200 text-sm transition"
            >
              {isSignup
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up as Coordinator"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          MEDHA 2026 — Kongunadu College of Engineering & Technology
        </p>
      </div>
    </div>
  );
}
