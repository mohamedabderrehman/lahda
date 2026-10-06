import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupportChannels, createSupportChannel, updateSupportChannel, deleteSupportChannel } from '../api/client';

type Channel = { id: string; type: string; label: string; value: string; iconName: string | null; sortOrder: number; isActive: boolean };

const CHANNEL_TYPES = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'other', label: 'Other' },
];

export default function SupportChannels() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['support-channels'], queryFn: getSupportChannels });
  const [editing, setEditing] = useState<Channel | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: 'phone', label: '', value: '', iconName: '', sortOrder: 0, isActive: true });

  const createMut = useMutation({
    mutationFn: () => createSupportChannel({ ...form, iconName: form.iconName || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-channels'] }); setCreating(false); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: () => updateSupportChannel(editing!.id, { ...form, iconName: form.iconName || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-channels'] }); setEditing(null); resetForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSupportChannel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-channels'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateSupportChannel(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-channels'] }),
  });

  function resetForm() {
    setForm({ type: 'phone', label: '', value: '', iconName: '', sortOrder: 0, isActive: true });
  }

  function startEdit(ch: Channel) {
    setEditing(ch);
    setCreating(false);
    setForm({ type: ch.type, label: ch.label, value: ch.value, iconName: ch.iconName || '', sortOrder: ch.sortOrder, isActive: ch.isActive });
  }

  function startCreate() {
    setEditing(null);
    setCreating(true);
    resetForm();
  }

  const channels = data ?? [];

  if (isLoading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Channels</h1>
        <button onClick={startCreate} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
          + Add Channel
        </button>
      </div>

      {(creating || editing) && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editing ? 'Edit Channel' : 'New Channel'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input w-full">
                {CHANNEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label (Arabic)</label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input w-full" placeholder="e.g. الهاتف" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="input w-full" placeholder="e.g. +9647700000000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="input w-full" />
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} id="ch-active" />
              <label htmlFor="ch-active" className="text-sm text-gray-700">Active</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
              disabled={createMut.isPending || updateMut.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {editing ? 'Save' : 'Create'}
            </button>
            <button onClick={() => { setEditing(null); setCreating(false); resetForm(); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {channels.map((ch: Channel) => (
          <div key={ch.id} className="card p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{ch.type}</span>
                <span className="font-semibold text-gray-900">{ch.label}</span>
                {!ch.isActive && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Inactive</span>}
              </div>
              <p className="text-sm text-gray-500 mt-1">{ch.value}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMut.mutate({ id: ch.id, isActive: !ch.isActive })}
                className={`px-3 py-1 rounded text-xs font-medium ${ch.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                {ch.isActive ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => startEdit(ch)} className="px-3 py-1 bg-gray-50 text-gray-700 rounded text-xs font-medium hover:bg-gray-100">
                Edit
              </button>
              <button
                onClick={() => { if (confirm('Delete this channel?')) deleteMut.mutate(ch.id); }}
                className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {channels.length === 0 && <div className="card p-8 text-center text-gray-500">No support channels yet. Add one to get started.</div>}
      </div>
    </div>
  );
}
