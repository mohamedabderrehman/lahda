import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupportChannels, createSupportChannel, updateSupportChannel, deleteSupportChannel } from '../../api/client';

type Channel = { 
  id: string; 
  type: string; 
  label: string; 
  value: string; 
  iconName: string | null; 
  sortOrder: number; 
  isActive: boolean;
};

const CHANNEL_TYPES = [
  { value: 'phone', label: '📞 هاتف', icon: '📞' },
  { value: 'email', label: '📧 بريد إلكتروني', icon: '📧' },
  { value: 'whatsapp', label: '💬 واتساب', icon: '💬' },
  { value: 'telegram', label: '📱 تيليجرام', icon: '📱' },
  { value: 'instagram', label: '📷 انستغرام', icon: '📷' },
  { value: 'facebook', label: '👤 فيسبوك', icon: '👤' },
  { value: 'other', label: '🔗 أخرى', icon: '🔗' },
];

export default function SupportChannelsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['support-channels'], queryFn: getSupportChannels });
  const [editing, setEditing] = useState<Channel | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    type: 'phone',
    label: '',
    value: '',
    sortOrder: 0,
    isActive: true,
  });

  const createMut = useMutation({
    mutationFn: () => createSupportChannel({ ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-channels'] });
      setCreating(false);
      resetForm();
    },
  });

  const updateMut = useMutation({
    mutationFn: () => updateSupportChannel(editing!.id, { ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-channels'] });
      setEditing(null);
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSupportChannel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-channels'] }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateSupportChannel(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-channels'] }),
  });

  function resetForm() {
    setForm({ type: 'phone', label: '', value: '', sortOrder: 0, isActive: true });
  }

  function startEdit(ch: Channel) {
    setEditing(ch);
    setCreating(false);
    setForm({
      type: ch.type,
      label: ch.label,
      value: ch.value,
      sortOrder: ch.sortOrder,
      isActive: ch.isActive,
    });
  }

  function startCreate() {
    setEditing(null);
    setCreating(true);
    resetForm();
  }

  const channels = (data ?? []) as Channel[];

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <h3 className="font-semibold text-teal-900 mb-1">📞 قنوات التواصل:</h3>
        <p className="text-sm text-teal-800">
          هذه القنوات تظهر في تطبيق العميل ضمن قسم "الدعم" أو "اتصل بنا".
          أضف طرق التواصل المتاحة (هاتف، واتساب، بريد، ...) ليتمكن العملاء من التواصل معكم.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">إجمالي القنوات: <span className="font-semibold">{channels.length}</span></p>
        <button
          onClick={startCreate}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
        >
          + إضافة قناة جديدة
        </button>
      </div>

      {(creating || editing) && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editing ? 'تعديل قناة' : 'إضافة قناة جديدة'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع القناة</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                {CHANNEL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم المعروض</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="مثال: الدعم الفني"
                dir="rtl"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">القيمة (رقم/رابط/بريد)</label>
              <input
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder={form.type === 'phone' || form.type === 'whatsapp' ? '+9647700000000' : form.type === 'email' ? 'support@example.com' : 'https://...'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {form.type === 'phone' && 'أدخل رقم الهاتف مع رمز الدولة'}
                {form.type === 'whatsapp' && 'أدخل رقم واتساب مع رمز الدولة'}
                {form.type === 'email' && 'أدخل البريد الإلكتروني'}
                {(form.type === 'instagram' || form.type === 'facebook' || form.type === 'telegram') && 'أدخل اسم المستخدم أو الرابط'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <span className="text-sm text-gray-700">نشط</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => (editing ? updateMut.mutate() : createMut.mutate())}
              disabled={createMut.isPending || updateMut.isPending}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {editing ? 'حفظ التغييرات' : 'إضافة'}
            </button>
            <button
              onClick={() => { setEditing(null); setCreating(false); resetForm(); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => {
            const typeInfo = CHANNEL_TYPES.find(t => t.value === ch.type) || CHANNEL_TYPES[6];
            return (
              <div key={ch.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                  {typeInfo.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{ch.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{typeInfo.label}</span>
                    {!ch.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">معطل</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 font-mono">{ch.value}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMut.mutate({ id: ch.id, isActive: !ch.isActive })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      ch.isActive
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                    }`}
                  >
                    {ch.isActive ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button
                    onClick={() => startEdit(ch)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => { if (confirm('حذف هذه القناة؟')) deleteMut.mutate(ch.id); }}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                  >
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
          {channels.length === 0 && (
            <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-xl">
              لا توجد قنوات تواصل. أضف قناة للبدء.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
