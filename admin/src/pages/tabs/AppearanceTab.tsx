import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, patchSettings } from '../../api/client';

export default function AppearanceTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const [appNameAr, setAppNameAr] = useState('');
  const [appNameEn, setAppNameEn] = useState('');

  useEffect(() => {
    if (data) {
      setAppNameAr(data.appNameAr ?? '');
      setAppNameEn(data.appNameEn ?? '');
    }
  }, [data]);

  const update = useMutation({
    mutationFn: patchSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      alert('✅ تم حفظ الإعدادات بنجاح');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      appNameAr: appNameAr || undefined,
      appNameEn: appNameEn || undefined,
    });
  };

  if (isLoading) return <div className="p-6 text-gray-500">جاري التحميل...</div>;
  if (error) return <div className="p-6 text-red-600">{String(error)}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-1">المظهر العام</h3>
        <p className="text-sm text-blue-800">
          اسم التطبيق يظهر في تطبيق العميل. شعار التطبيق ثابت ولا يمكن تغييره من لوحة التحكم.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم التطبيق (عربي)</label>
          <input
            type="text"
            value={appNameAr}
            onChange={(e) => setAppNameAr(e.target.value)}
            placeholder="لحظة"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            dir="rtl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم التطبيق (إنجليزي)</label>
          <input
            type="text"
            value={appNameEn}
            onChange={(e) => setAppNameEn(e.target.value)}
            placeholder="Lahda"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={update.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {update.isPending ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
          {update.isSuccess && <span className="text-green-600 text-sm">✅ تم الحفظ بنجاح</span>}
          {update.isError && <span className="text-red-600 text-sm">⚠️ {String(update.error)}</span>}
        </div>
      </form>

      {/* Preview Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">معاينة المظهر</h3>
        <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-xs">
              شعار
            </div>
            <div>
              <p className="font-bold text-gray-900">{appNameAr || 'لحظة'}</p>
              <p className="text-xs text-gray-500">{appNameEn || 'Lahda'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
