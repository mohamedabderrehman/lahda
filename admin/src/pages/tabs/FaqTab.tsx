import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFaq, createFaq, updateFaq, deleteFaq } from '../../api/client';

type FaqItem = {
  id: string;
  questionAr: string;
  questionEn?: string | null;
  answerAr: string;
  answerEn?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export default function FaqTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['faq'],
    queryFn: getFaq,
  });

  const create = useMutation({
    mutationFn: createFaq,
    onSuccess: () => {
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['faq'] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateFaq>[1] }) => updateFaq(id, data),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['faq'] });
    },
  });

  const remove = useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faq'] }),
  });

  const items = (data ?? []) as FaqItem[];

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
        <h3 className="font-semibold text-violet-900 mb-1">❓ الأسئلة الشائعة (FAQ):</h3>
        <p className="text-sm text-violet-800">
          هذه الأسئلة تظهر في تطبيق العميل ضمن قسم "المساعدة" أو "الأسئلة الشائعة".
          أضف الأسئلة الأكثر شيوعاً لمساعدة العملاء على فهم كيفية استخدام التطبيق.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">إجمالي الأسئلة: <span className="font-semibold">{items.length}</span></p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700"
        >
          + إضافة سؤال جديد
        </button>
      </div>

      {showAdd && (
        <FaqForm
          onSave={(d) => create.mutate(d)}
          onCancel={() => setShowAdd(false)}
          loading={create.isPending}
          error={create.isError ? String(create.error) : null}
        />
      )}

      {editing && (
        <FaqForm
          initial={editing}
          onSave={(d) => update.mutate({ id: editing.id, data: d })}
          onCancel={() => setEditing(null)}
          loading={update.isPending}
          error={update.isError ? String(update.error) : null}
        />
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="text-red-600 text-center py-8">{String(error)}</div>
      ) : (
        <div className="space-y-4">
          {items.map((f) => (
            <div key={f.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-violet-500">Q:</span>
                    {f.questionAr}
                    {!f.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        معطل
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg">
                    <span className="text-violet-500 font-medium">A:</span> {f.answerAr}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">الترتيب: {f.sortOrder}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(f)}
                    className="text-sm text-violet-600 hover:text-violet-800 font-medium"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('حذف هذا السؤال؟')) remove.mutate(f.id);
                    }}
                    disabled={remove.isPending}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-xl">
              لا توجد أسئلة. أضف سؤالاً للبدء.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FaqForm({
  initial,
  onSave,
  onCancel,
  loading,
  error,
}: {
  initial?: FaqItem | null;
  onSave: (data: { questionAr: string; questionEn?: string; answerAr: string; answerEn?: string; sortOrder?: number; isActive?: boolean }) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [questionAr, setQuestionAr] = useState(initial?.questionAr ?? '');
  const [questionEn, setQuestionEn] = useState(initial?.questionEn ?? '');
  const [answerAr, setAnswerAr] = useState(initial?.answerAr ?? '');
  const [answerEn, setAnswerEn] = useState(initial?.answerEn ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {initial ? 'تعديل سؤال' : 'إضافة سؤال جديد'}
      </h3>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!questionAr.trim() || !answerAr.trim()) return;
          onSave({
            questionAr: questionAr.trim(),
            questionEn: questionEn.trim() || undefined,
            answerAr: answerAr.trim(),
            answerEn: answerEn.trim() || undefined,
            sortOrder,
            isActive,
          });
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">السؤال (عربي) *</label>
          <input
            type="text"
            value={questionAr}
            onChange={(e) => setQuestionAr(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
            dir="rtl"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">السؤال (إنجليزي)</label>
          <input
            type="text"
            value={questionEn}
            onChange={(e) => setQuestionEn(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الإجابة (عربي) *</label>
          <textarea
            value={answerAr}
            onChange={(e) => setAnswerAr(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
            dir="rtl"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الإجابة (إنجليزي)</label>
          <textarea
            value={answerEn}
            onChange={(e) => setAnswerEn(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-violet-600 rounded"
            />
            <span className="text-sm text-gray-700">نشط (يظهر في التطبيق)</span>
          </label>
        </div>
        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
