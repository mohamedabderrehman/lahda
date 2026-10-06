import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDrivers, setDriverApproved, createDriver, updateDriver } from '../../api/client';

type DriverItem = {
  id: string;
  isApproved: boolean;
  isOnline: boolean;
  nationalId?: string | null;
  vehicleInfo?: string | null;
  user?: { id: string; email: string; fullName: string; phone: string | null; isActive?: boolean };
};

export default function DriversTab() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DriverItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-drivers', page],
    queryFn: () => getDrivers(page, 15),
  });

  const approve = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => setDriverApproved(id, approved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-drivers'] }),
  });

  const create = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateDriver>[1] }) => updateDriver(id, payload),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
    },
  });

  const items = (data?.items ?? []) as DriverItem[];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 15);

  // Filter
  const filteredItems = searchTerm
    ? items.filter(d => 
        d.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.user?.phone?.includes(searchTerm) ||
        d.vehicleInfo?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  // Stats
  const onlineDrivers = items.filter(d => d.isOnline).length;
  // Stats calculated for potential display
  const approvedDrivers = items.filter(d => d.isApproved).length;
  void approvedDrivers;
  const pendingApproval = items.filter(d => !d.isApproved).length;

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <p className="text-sm text-indigo-800">
          <strong>🚗 السائقين:</strong> هؤلاء هم مندوبو التوصيل الذين ينقلون الطلبات من المتاجر للعملاء.
          يجب الموافقة على السائق قبل أن يتمكن من استلام الطلبات.
          السائقين النشطون هم من يمكنهم رؤية واستلام الطلبات المتاحة.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{items.length}</div>
          <div className="text-sm text-blue-600">إجمالي السائقين</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{onlineDrivers}</div>
          <div className="text-sm text-green-600">متصلين الآن</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{pendingApproval}</div>
          <div className="text-sm text-amber-600">بانتظار الموافقة</div>
        </div>
      </div>

      {/* Search and Add */}
      <div className="flex gap-4 justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="🔍 البحث بالاسم، البريد، رقم الهاتف، أو معلومات المركبة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
        >
          <span>+</span>
          إضافة سائق جديد
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateDriverModal
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => create.mutate(data)}
          isSubmitting={create.isPending}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <EditDriverModal
          driver={editing}
          onClose={() => setEditing(null)}
          onSubmit={(payload) => update.mutate({ id: editing.id, payload })}
          isSubmitting={update.isPending}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : error ? (
        <div className="text-red-600 text-center py-8">{String(error)}</div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">السائق</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">معلومات المركبة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الرقم الوطني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      لا يوجد سائقين {searchTerm && 'مطابقين للبحث'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ml-3 ${d.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{d.user?.fullName || '—'}</div>
                            <div className="text-xs text-gray-500">{d.user?.email}</div>
                            <div className="text-xs text-gray-400">{d.user?.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{d.vehicleInfo || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{d.nationalId || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            d.isApproved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {d.isApproved ? '✅ معتمد' : '⏳ بانتظار الموافقة'}
                          </span>
                          {d.user?.isActive === false && (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ⛔ معطل
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => approve.mutate({ id: d.id, approved: !d.isApproved })}
                            disabled={approve.isPending}
                            className={`text-sm font-medium ${d.isApproved ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}`}
                          >
                            {d.isApproved ? 'إلغاء الموافقة' : '✅ موافقة'}
                          </button>
                          <button
                            onClick={() => setEditing(d)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            تعديل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">الصفحة {page} من {pages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  السابق
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateDriverModal({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void;
  onSubmit: (data: Parameters<typeof createDriver>[0]) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    nationalId: '',
    vehicleInfo: '',
    isApproved: true,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">إضافة سائق جديد</h2>
          <p className="text-sm text-gray-500 mt-1">أدخل بيانات السائق لإنشاء حساب جديد</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">معلومات المركبة</label>
            <input
              type="text"
              value={form.vehicleInfo}
              onChange={(e) => setForm({ ...form, vehicleInfo: e.target.value })}
              placeholder="نوع السيارة، اللون، رقم اللوحة..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">هذه المعلومات تظهر للإدارة فقط</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الوطني</label>
            <input
              type="text"
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isApproved"
              checked={form.isApproved}
              onChange={(e) => setForm({ ...form, isApproved: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="isApproved" className="text-sm text-gray-700">
              معتمد فوراً (يمكنه استلام الطلبات مباشرة)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              إلغاء
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء السائق'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditDriverModal({
  driver,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  driver: DriverItem;
  onClose: () => void;
  onSubmit: (payload: Parameters<typeof updateDriver>[1]) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    fullName: driver.user?.fullName ?? '',
    email: driver.user?.email ?? '',
    phone: driver.user?.phone ?? '',
    nationalId: driver.nationalId ?? '',
    vehicleInfo: driver.vehicleInfo ?? '',
    isApproved: driver.isApproved,
    isActive: driver.user?.isActive ?? true,
    newPassword: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">تعديل بيانات السائق</h2>
          <p className="text-sm text-gray-500 mt-1">{driver.user?.fullName}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const payload: Parameters<typeof onSubmit>[0] = {
              fullName: form.fullName,
              email: form.email,
              phone: form.phone || null,
              nationalId: form.nationalId,
              vehicleInfo: form.vehicleInfo,
              isApproved: form.isApproved,
              isActive: form.isActive,
            };
            if (form.newPassword.trim()) payload.newPassword = form.newPassword.trim();
            onSubmit(payload);
          }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">معلومات المركبة</label>
            <input
              type="text"
              value={form.vehicleInfo}
              onChange={(e) => setForm({ ...form, vehicleInfo: e.target.value })}
              placeholder="نوع السيارة، اللون، رقم اللوحة..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الوطني</label>
            <input
              type="text"
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              placeholder="اترك فارغاً للإبقاء على الحالية"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">اترك هذا الحقل فارغاً إذا لا تريد تغيير كلمة المرور</p>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isApproved}
                onChange={(e) => setForm({ ...form, isApproved: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-700">معتمد (يمكن استلام الطلبات)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-700">الحساب نشط</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              إلغاء
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
