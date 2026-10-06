import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, patchSettings, type PricingConfig, type PricingBand } from '../../api/client';

export default function PricingTab() {
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
      alert('✅ تم حفظ إعدادات التسعير بنجاح');
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  if (isLoading || !pricingConfig) {
    return <div className="p-6 text-gray-500">جاري التحميل...</div>;
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
    if (pricingConfig.appFee.threshold <= 0) return 'عتبة رسوم التطبيق يجب أن تكون أكبر من صفر';
    if (pricingConfig.appFee.belowThreshold < 0) return 'رسوم التطبيق يجب أن تكون غير سالبة';
    if (pricingConfig.appFee.aboveThreshold < 0) return 'رسوم التطبيق يجب أن تكون غير سالبة';
    if (pricingConfig.distanceBands.length === 0) return 'يجب إضافة شريحة مسافة واحدة على الأقل';

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
    <div className="p-6 space-y-8">
      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-900 mb-1">💡 كيفية حساب تكلفة الطلب:</h3>
        <ul className="text-sm text-green-800 space-y-1 mr-4 list-disc">
          <li><strong>سعر المنتجات:</strong> مجموع أسعار المنتجات المطلوبة</li>
          <li><strong>رسوم التوصيل:</strong> تحسب بناءً على المسافة بين المتجر والعميل (حسب الشرائح أدناه)</li>
          <li><strong>رسوم التطبيق:</strong> تُحسب على سعر المنتجات فقط (بدون رسوم التوصيل)</li>
          <li><strong>الإجمالي:</strong> سعر المنتجات + رسوم التوصيل + رسوم التطبيق</li>
        </ul>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* App Fee Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">📱</div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">رسوم التطبيق (App Fee)</h2>
            <p className="text-sm text-gray-500">رسوم تُحسب على قيمة المنتجات فقط (بدون رسوم التوصيل)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عتبة القيمة (د.ع)</label>
            <input
              type="number"
              value={pricingConfig.appFee.threshold}
              onChange={(e) => updateAppFee('threshold', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">مثال: 500 د.ع</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رسوم التطبيق - فوق العتبة (د.ع)</label>
            <input
              type="number"
              value={pricingConfig.appFee.aboveThreshold}
              onChange={(e) => updateAppFee('aboveThreshold', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">مثال: 0 د.ع (مجاني)</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>القاعدة الحالية:</strong>{' '}
            إذا كانت قيمة المنتجات أقل من {pricingConfig.appFee.threshold.toLocaleString()} د.ع{' '}
            → الرسوم {pricingConfig.appFee.belowThreshold.toLocaleString()} د.ع |{' '}
            إذا كانت {pricingConfig.appFee.threshold.toLocaleString()} د.ع أو أكثر{' '}
            → الرسوم {pricingConfig.appFee.aboveThreshold.toLocaleString()} د.ع
          </p>
        </div>
      </div>

      {/* Distance Bands Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl">🛣️</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">شرائح التوصيل حسب المسافة</h2>
              <p className="text-sm text-gray-500">رسوم التوصيل تحسب بناءً على المسافة بين المتجر والعميل</p>
            </div>
          </div>
          <button
            onClick={addBand}
            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-medium hover:bg-amber-200"
          >
            + إضافة شريحة
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">من (كم)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إلى (كم)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رسوم التوصيل (د.ع)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pricingConfig.distanceBands.map((band, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={band.minKm}
                      onChange={(e) => updateBand(index, 'minKm', Number(e.target.value))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      min="0"
                      step="0.1"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={band.maxKm ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateBand(index, 'maxKm', val === '' ? null : Number(val));
                      }}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      min="0"
                      step="0.1"
                      placeholder="∞"
                    />
                    <p className="text-xs text-gray-400 mt-1">اترك فارغاً للشريحة الأخيرة</p>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={band.fee}
                      onChange={(e) => updateBand(index, 'fee', Number(e.target.value))}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      min="0"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => removeBand(index)}
                      className="text-red-600 text-sm font-medium hover:text-red-800"
                      disabled={pricingConfig.distanceBands.length <= 1}
                    >
                      🗑️ حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-amber-50 rounded-lg">
          <p className="text-sm text-amber-800 font-medium mb-2">⚠️ ملاحظات مهمة:</p>
          <ul className="text-sm text-amber-800 mr-4 list-disc space-y-1">
            <li>أول شريحة يجب أن تبدأ من 0 كم</li>
            <li>الشرائح يجب أن تكون متجاورة (الحد الأعلى = الحد الأدنى للتالية)</li>
            <li>آخر شريحة يجب أن تكون مفتوحة (بدون حد أعلى) - اترك حقل "إلى" فارغاً</li>
            <li>المسافة المحسوبة باستخدام Haversine (خط مستقيم)</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 shadow-lg"
        >
          {saveMutation.isPending ? '⏳ جاري الحفظ...' : '💾 حفظ إعدادات التسعير'}
        </button>
      </div>
    </div>
  );
}
