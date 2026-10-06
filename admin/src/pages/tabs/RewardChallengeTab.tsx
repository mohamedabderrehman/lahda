import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSettings,
  patchSettings,
  type RewardChallengeConfig,
  type RewardChallengeTier,
} from '../../api/client';

const DEFAULT_CONFIG: RewardChallengeConfig = {
  timeWindowMinutes: 300,
  tiers: [
    { trips: 5, amount: 500 },
    { trips: 7, amount: 800 },
    { trips: 15, amount: 1500 },
  ],
};

export default function RewardChallengeTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const [config, setConfig] = useState<RewardChallengeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.rewardChallengeConfig) {
      setConfig(settings.rewardChallengeConfig);
    } else if (settings && !settings.rewardChallengeConfig) {
      setConfig(DEFAULT_CONFIG);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (c: RewardChallengeConfig) => patchSettings({ rewardChallengeConfig: c }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setError(null);
      alert('تم حفظ إعدادات تحدي المكافآت بنجاح');
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  if (isLoading || !config) {
    return <div className="p-6 text-gray-500">جاري التحميل...</div>;
  }

  const updateTimeWindow = (value: number) => {
    setConfig({ ...config, timeWindowMinutes: value });
  };

  const updateTier = (index: number, field: keyof RewardChallengeTier, value: number) => {
    const tiers = [...config.tiers];
    tiers[index] = { ...tiers[index], [field]: value };
    setConfig({ ...config, tiers });
  };

  const validateConfig = (): string | null => {
    if (config.timeWindowMinutes <= 0) return 'نافذة الوقت يجب أن تكون أكبر من صفر';
    if (config.timeWindowMinutes > 1440) return 'نافذة الوقت يجب ألا تتجاوز 1440 دقيقة (24 ساعة)';
    if (config.tiers.length < 1 || config.tiers.length > 3) return 'يجب إضافة 1 إلى 3 مستويات';

    const sorted = [...config.tiers].sort((a, b) => a.trips - b.trips);
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      if (t.trips <= 0) return `المستوى ${i + 1}: عدد الرحلات يجب أن يكون أكبر من صفر`;
      if (t.amount < 0) return `المستوى ${i + 1}: المبلغ يجب أن يكون غير سالب`;
      if (i > 0 && t.trips <= sorted[i - 1].trips) {
        return 'المستويات يجب أن تكون مرتبة تصاعدياً حسب عدد الرحلات';
      }
    }
    return null;
  };

  const handleSave = () => {
    const validationError = validateConfig();
    if (validationError) {
      setError(validationError);
      return;
    }
    saveMutation.mutate(config);
  };

  return (
    <div className="p-6 space-y-8">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-1">تحدي المكافآت اليومي</h3>
        <ul className="text-sm text-gray-700 space-y-1 mr-4 list-disc">
          <li>السائق يبدأ تحدي محدود زمنياً (مثلاً 5 ساعات)</li>
          <li>يكمل توصيلات خلال هذه النافذة</li>
          <li>يحصل على مكافأة نقدية حسب المستوى المحقق (عدد الرحلات)</li>
          <li>تحدي واحد لكل يوم تقويمي</li>
        </ul>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">الإعدادات</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            نافذة الوقت (دقيقة)
          </label>
          <input
            type="number"
            value={config.timeWindowMinutes}
            onChange={(e) => updateTimeWindow(Number(e.target.value))}
            className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            min={1}
            max={1440}
            step={1}
          />
          <p className="text-xs text-gray-500 mt-1">مثال: 300 = 5 ساعات</p>
        </div>

        <h3 className="text-base font-medium text-gray-900 mb-3">المستويات (1–3)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  المستوى
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  عدد الرحلات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  المبلغ (د.ع)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {config.tiers.map((tier, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={tier.trips}
                      onChange={(e) => updateTier(index, 'trips', Number(e.target.value))}
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      min={1}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={tier.amount}
                      onChange={(e) => updateTier(index, 'amount', Number(e.target.value))}
                      className="w-36 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      min={0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 shadow-lg"
        >
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات تحدي المكافآت'}
        </button>
      </div>
    </div>
  );
}
