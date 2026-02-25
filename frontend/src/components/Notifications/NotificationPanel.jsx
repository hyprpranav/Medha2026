import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Send } from 'lucide-react';
import { formatTimestamp } from '../../utils/helpers';

export default function NotificationPanel() {
  const { isAdmin, user, userData } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  const sendNotification = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        message: message.trim(),
        type: 'announcement',
        sentBy: userData?.name || 'System',
        sentByUid: user.uid,
        timestamp: serverTimestamp(),
      });
      setMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Notifications</h2>

      {/* Send Notification (Admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-700 mb-3">Send Notification</h3>
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a notification message..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && sendNotification()}
            />
            <button
              onClick={sendNotification}
              disabled={sending || !message.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Notification List */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Recent Notifications</h3>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-800">{notif.message}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span>By {notif.sentBy}</span>
                  <span>•</span>
                  <span>{formatTimestamp(notif.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
