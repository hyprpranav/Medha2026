import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Mail, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:8000';

export default function EmailPanel() {
  const { isAdmin, user } = useAuth();
  const [mode, setMode] = useState('manual'); // 'manual' | 'broadcast'
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    if (mode === 'manual' && !to.trim()) {
      toast.error('Please enter recipient email');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${EMAIL_API_URL}/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode, // 'manual' or 'broadcast'
          to: mode === 'manual' ? to : undefined,
          subject,
          body,
          senderUid: user.uid,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(mode === 'broadcast' ? 'Broadcast email sent to all teams!' : 'Email sent successfully!');
        setTo('');
        setSubject('');
        setBody('');
      } else {
        toast.error(data.detail || 'Failed to send email');
      }
    } catch (err) {
      console.error('Email error:', err);
      toast.error('Failed to connect to email service. Is the backend running?');
    } finally {
      setSending(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Mail size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Only admins can send emails.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Email System</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            <Mail size={16} className="inline mr-1" /> Manual Email
          </button>
          <button
            onClick={() => setMode('broadcast')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'broadcast' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            <Users size={16} className="inline mr-1" /> Broadcast
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-2xl">
        {mode === 'broadcast' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠ Broadcast will send this email to ALL registered team leaders.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {mode === 'manual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@email.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                Sending...
              </span>
            ) : (
              <>
                <Send size={16} className="inline mr-1" />
                {mode === 'broadcast' ? 'Send Broadcast' : 'Send Email'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
