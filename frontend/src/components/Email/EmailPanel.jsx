import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeams } from '../../hooks/useTeams';
import { Send, Mail, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || 'http://localhost:8000';

export default function EmailPanel() {
  const { isAdmin, user } = useAuth();
  const { getAllTeams } = useTeams();
  const [mode, setMode] = useState('manual'); // 'manual' | 'broadcast'
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // {sent, total, errors}

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
    setResult(null);
    try {
      let payload = {
        mode,
        subject,
        body,
        senderUid: user.uid,
      };

      if (mode === 'manual') {
        payload.to = to;
      } else {
        // Broadcast: fetch all team emails from Firestore client-side
        toast('Fetching team emails…', { icon: '📧' });
        const allTeams = await getAllTeams();
        const emails = allTeams
          .map(t => t.leaderEmail)
          .filter(e => e && e.includes('@'));
        if (emails.length === 0) {
          toast.error('No valid team leader emails found');
          setSending(false);
          return;
        }
        payload.recipients = emails;
        toast(`Sending to ${emails.length} team leaders…`, { icon: '📨' });
      }

      const response = await fetch(`${EMAIL_API_URL}/send-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (mode === 'broadcast') {
          setResult({ sent: data.sent, total: data.total, errors: data.errors });
          toast.success(`Broadcast: ${data.sent}/${data.total} emails sent!`);
        } else {
          toast.success('Email sent successfully!');
        }
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
            onClick={() => { setMode('manual'); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            <Mail size={16} className="inline mr-1" /> Manual Email
          </button>
          <button
            onClick={() => { setMode('broadcast'); setResult(null); }}
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
              ⚠ Broadcast will send this email to ALL registered team leaders with email addresses.
            </p>
          </div>
        )}

        {/* Result summary */}
        {result && (
          <div className={`rounded-xl p-4 mb-4 ${result.errors?.length ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {result.errors?.length
                ? <AlertTriangle size={16} className="text-orange-600" />
                : <CheckCircle size={16} className="text-green-600" />}
              <span className="text-sm font-semibold">{result.sent}/{result.total} emails sent successfully</span>
            </div>
            {result.errors?.length > 0 && (
              <ul className="text-xs text-orange-700 mt-2 space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
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
