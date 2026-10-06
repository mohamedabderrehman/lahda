import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFaq } from '../api/client';

export default function Faq() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['faq-help'],
    queryFn: getFaq,
  });

  const items = (data ?? []).filter((f: { questionAr: string; answerAr: string }) =>
    f.questionAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.answerAr.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">الأسئلة الشائعة</h1>
        <p className="text-gray-600">
          هنا يمكنك رؤية الأسئلة الأكثر شيوعاً التي تظهر للعملاء في التطبيق.
          لإضافة أو تعديل الأسئلة، استخدم قسم "المحتوى &gt; الأسئلة الشائعة" من القائمة.
        </p>
      </div>

      <div>
        <input
          type="text"
          placeholder="🔍 البحث في الأسئلة..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {isLoading && <div className="text-center py-8 text-gray-500">جاري التحميل...</div>}
      {error && <div className="text-red-600 text-center py-8">{String(error)}</div>}

      <div className="space-y-4">
        {items.map((f: { id: string; questionAr: string; answerAr: string; isActive: boolean }) => (
          <div key={f.id} className={`bg-white border rounded-xl p-6 ${f.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-violet-500">❓</span>
              {f.questionAr}
              {!f.isActive && <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">معطل</span>}
            </h3>
            <p className="mt-3 text-gray-600 leading-relaxed">{f.answerAr}</p>
          </div>
        ))}
        {items.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد أسئلة بعد'}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-8">
        <p className="text-sm text-blue-800">
          <strong>💡 تلميح:</strong> هل تريد إضافة أو تعديل الأسئلة؟
          <a href="#/content/faq" className="mr-1 underline hover:text-blue-900">
            انتقل إلى إدارة الأسئلة الشائعة
          </a>
        </p>
      </div>
    </div>
  );
}
