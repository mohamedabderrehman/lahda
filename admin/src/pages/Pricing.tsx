import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, patchSettings, type PricingConfig, type PricingBand } from '../api/client';

export default function Pricing() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.pricingConfig) {
      setPricingConfig(settings.pricingConfig);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (config: PricingConfig) => patchSettings({ pricingConfig: config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setError(null);
      alert('تم حفظ الإعدادات بنجاح');
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  if (isLoading || !pricingConfig) {
    return <div className="text-gray-500">جاري التحميل...</div>;
  }

  const updateAppFee = (field: keyof PricingConfig['appFee'], value: number) => {
    setPricingConfig({
      ...pricingConfig,
      appFee: { ...pricingConfig.appFee, [field]: value },
    });
  };

  const updateBand = (index: number, field: keyof PricingBand, value: number | null) => {
    const newBands = [...pricingConfig.distanceBands];
    newBands[index] = { ...newBands[index], [field]: value };
    setPricingConfig({ ...pricingConfig, distanceBands: newBands });
  };

  const addBand = () => {
    const lastBand = pricingConfig.distanceBands[pricingConfig.distanceBands.length - 1];
    const newBand: PricingBand = {
      minKm: lastBand?.maxKm || 0,
      maxKm: null,
      fee: 2500,
    };
    // If last band had null max, set it now
    if (lastBand && lastBand.maxKm === null) {
      lastBand.maxKm = lastBand.minKm + 5;
      newBand.minKm = lastBand.maxKm;
    }
    setPricingConfig({
      ...pricingConfig,
      distanceBands: [...pricingConfig.distanceBands, newBand],
    });
  };

  const removeBand = (index: number) => {
    if (pricingConfig.distanceBands.length <= 1) {
      setError('يجب الاحتفاظ بشريحة واحدة على الأقل');
      return;
    }
    const newBands = pricingConfig.distanceBands.filter((_, i) => i !== index);
    setPricingConfig({ ...pricingConfig, distanceBands: newBands });
  };

  const validateConfig = (): string | null => {
    // Check app fee
    if (pricingConfig.appFee.threshold <= 0) return 'عتبة رسوم التطبيق يجب أن تكون أكبر من صفر';
    if (pricingConfig.appFee.belowThreshold < 0) return 'رسوم التطبيق يجب أن تكون غير سالبة';
    if (pricingConfig.appFee.aboveThreshold < 0) return 'رسوم التطبيق يجب أن تكون غير سالبة';

    // Check bands
    if (pricingConfig.distanceBands.length === 0) return 'يجب إضافة شريحة مسافة واحدة على الأقل';

    // Sort and check
    const sorted = [...pricingConfig.distanceBands].sort((a, b) => a.minKm - b.minKm);

    if (sorted[0].minKm !== 0) return 'أول شريحة يجب أن تبدأ من 0 كم';

    for (let i = 0; i < sorted.length; i++) {
      const band = sorted[i];
      if (band.maxKm !== null && band.maxKm <= band.minKm) {
        return `شريحة ${i + 1}: الحد الأعلى يجب أن يكون أكبر من الحد الأدنى`;
      }
      if (band.fee < 0) {
        return `شريحة ${i + 1}: الرسوم يجب أن تكون غير سالبة`;
      }
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (band.maxKm !== next.minKm) {
          return `شريحة ${i + 1} و ${i + 2}: يجب أن تكون متجاورة (الحد الأعلى = الحد الأدنى للتالية)`;
        }
      }
      // Last band must be open-ended
      if (i === sorted.length - 1 && band.maxKm !== null) {
        return 'آخر شريحة يجب أن تكون مفتوحة (بدون حد أعلى)';
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
    saveMutation.mutate(pricingConfig);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">إعدادات التسعير</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="btn-primary"
        >
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* App Fee Section */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">رسوم التطبيق (App Fee)</h2>
        <p className="text-sm text-gray-500">
          يتم احتساب رسوم التطبيق بناءً على قيمة المنتجات (بدون رسوم التوصيل)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عتبة القيمة (د.ع)</label>
            <input
              type="number"
              value={pricingConfig.appFee.threshold}
              onChange={(e) => updateAppFee('threshold', Number(e.target.value))}
              className="input"
              min="0"
              step="100"
            />
            <p className="text-xs text-gray-500 mt-1">الطلبات أقل من هذا المبلغ</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رسوم التطبيق - تحت العتبة (د.ع)</label>
            <input
              type="number"
              value={pricingConfig.appFee.belowThreshold}
              onChange={(e) => updateAppFee('belowThreshold', Number(e.target.value))}
              className="input"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رسوم التطبيق - فوق العتبة (د.ع)</label>
            <input
              type="number"
              value={pricingConfig.appFee.aboveThreshold}
              onChange={(e) => updateAppFee('aboveThreshold', Number(e.target.value))}
              className="input"
              min="0"
            />
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>القواعد الحالية:</strong>{' '}
            إذا كانت قيمة المنتجات أقل من {pricingConfig.appFee.threshold.toLocaleString()} د.ع{' '}
            → الرسوم {pricingConfig.appFee.belowThreshold} د.ع |{' '}
            إذا كانت {pricingConfig.appFee.threshold.toLocaleString()} د.ع أو أكثر{' '}
            → الرسوم {pricingConfig.appFee.aboveThreshold} د.ع
          </p>
        </div>
      </div>

      {/* Distance Bands Section */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">شرائح التوصيل حسب المسافة</h2>
            <p className="text-sm text-gray-500">
              يتم حساب رسوم التوصيل بناءً على المسافة بين المتجر وعنوان العميل (Haversine)
            </p>
          </div>
          <button type="button" onClick={addBand} className="btn-ghost text-sm">
            + إضافة شريحة
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th text-right">من (كم)</th>
                <th className="table-th text-right">إلى (كم)</th>
                <th className="table-th text-right">رسوم التوصيل (د.ع)</th>
                <th className="table-th text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pricingConfig.distanceBands.map((band, index) => (
                <tr key={index}>
                  <td className="table-td">
                    <input
                      type="number"
                      value={band.minKm}
                      onChange={(e) => updateBand(index, 'minKm', Number(e.target.value))}
                      className="input w-24"
                      min="0"
                      step="0.1"
                    />
                  </td>
                  <td className="table-td">
                    <input
                      type="number"
                      value={band.maxKm ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateBand(index, 'maxKm', val === '' ? null : Number(val));
                      }}
                      className="input w-24"
                      min="0"
                      step="0.1"
                      placeholder="∞"
                    />
                  </td>
                  <td className="table-td">
                    <input
                      type="number"
                      value={band.fee}
                      onChange={(e) => updateBand(index, 'fee', Number(e.target.value))}
                      className="input w-32"
                      min="0"
                    />
                  </td>
                  <td className="table-td">
                    <button
                      type="button"
                      onClick={() => removeBand(index)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>ملاحظات:</strong>
          </p>
          <ul className="text-sm text-amber-800 list-disc list-inside mt-1 space-y-1">
            <li>أول شريحة يجب أن تبدأ من 0 كم</li>
            <li>الشرائح يجب أن تكون متجاورة (الحد الأعلى = الحد الأدنى للتالية)</li>
            <li>آخر شريحة يجب أن تكون مفتوحة (بدون حد أعلى) - اترك حقل "إلى" فارغاً</li>
            <li>المسافة المحسوبة باستخدام Haversine (خط مستقيم)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
