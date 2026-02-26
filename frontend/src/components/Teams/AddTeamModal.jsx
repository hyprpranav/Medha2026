import React, { useState } from 'react';
import { useTeams } from '../../hooks/useTeams';
import { X, Plus, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_MEMBER = { name: '', gender: 'Male' };

const TRACKS = [
  'Track 1: Embedded & IoT',
  'Track 2: Analytical',
];

const GENDERS = ['Male', 'Female'];

export default function AddTeamModal({ onClose }) {
  const { addTeam } = useTeams();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    teamId: '',
    teamName: '',
    collegeName: '',
    leaderName: '',
    leaderEmail: '',
    leaderPhone: '',
    leaderGender: 'Male',
    track: '',
    projectTitle: '',
    members: [],
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addMember = () => {
    if (form.members.length >= 4) {
      toast.error('Maximum 4 members allowed');
      return;
    }
    setForm(prev => ({ ...prev, members: [...prev.members, { ...EMPTY_MEMBER }] }));
  };

  const removeMember = (idx) => {
    setForm(prev => ({ ...prev, members: prev.members.filter((_, i) => i !== idx) }));
  };

  const updateMember = (idx, field, value) => {
    setForm(prev => {
      const members = [...prev.members];
      members[idx] = { ...members[idx], [field]: value };
      return { ...prev, members };
    });
  };

  const handleSubmit = async () => {
    if (!form.teamName.trim()) { toast.error('Team name is required'); return; }
    if (!form.leaderName.trim()) { toast.error('Leader name is required'); return; }
    if (!form.collegeName.trim()) { toast.error('College name is required'); return; }
    if (!form.track) { toast.error('Please select a track'); return; }

    for (let i = 0; i < form.members.length; i++) {
      if (!form.members[i].name.trim()) {
        toast.error(`Member ${i + 1} name is required`);
        return;
      }
    }

    setSaving(true);
    try {
      await addTeam(form);
      toast.success(`Team "${form.teamName}" added successfully!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add team. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserPlus size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Add New Team</h2>
              <p className="text-xs text-gray-400">Fill in team details and member info</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Team Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Team Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team ID <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. MT1-301"
                  value={form.teamId}
                  onChange={e => set('teamId', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter team name"
                  value={form.teamName}
                  onChange={e => set('teamName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">College Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter college name"
                  value={form.collegeName}
                  onChange={e => set('collegeName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Track <span className="text-red-500">*</span></label>
                <select
                  value={form.track}
                  onChange={e => set('track', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Select track...</option>
                  {TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Title <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="Project title"
                  value={form.projectTitle}
                  onChange={e => set('projectTitle', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Leader Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Team Leader</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leader Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.leaderName}
                  onChange={e => set('leaderName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={form.leaderGender}
                  onChange={e => set('leaderGender', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="leader@email.com"
                  value={form.leaderEmail}
                  onChange={e => set('leaderEmail', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={form.leaderPhone}
                  onChange={e => set('leaderPhone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </section>

          {/* Members */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Members <span className="text-gray-400 font-normal normal-case">({form.members.length}/4)</span>
              </h3>
              {form.members.length < 4 && (
                <button
                  onClick={addMember}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                >
                  <Plus size={14} /> Add Member
                </button>
              )}
            </div>

            {form.members.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                No members added yet. Leader counts as participant 1.<br />
                Click "Add Member" to add more.
              </div>
            ) : (
              <div className="space-y-3">
                {form.members.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <span className="text-xs font-medium text-gray-400 w-6">M{idx + 1}</span>
                    <input
                      type="text"
                      placeholder={`Member ${idx + 1} name`}
                      value={member.name}
                      onChange={e => updateMember(idx, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    />
                    <select
                      value={member.gender}
                      onChange={e => updateMember(idx, 'gender', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <button
                      onClick={() => removeMember(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Saving...
              </>
            ) : (
              <>
                <Plus size={16} /> Add Team
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
