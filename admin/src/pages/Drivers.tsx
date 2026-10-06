import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDrivers, setDriverApproved, createDriver, updateDriver } from '../api/client';

type DriverItem = {
  id: string;
  isApproved: boolean;
  isOnline: boolean;
  nationalId?: string | null;
  vehicleInfo?: string | null;
  user?: { id: string; email: string; fullName: string; phone: string | null; isActive?: boolean };
};

export default function Drivers() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DriverItem | null>(null);
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

  if (isLoading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{String(error)}</div>;

  const items = (data?.items ?? []) as DriverItem[];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="btn-primary"
        >
          Add Driver
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Vehicle Info</th>
                <th className="table-th">National ID</th>
                <th className="table-th">Status</th>
                <th className="table-th">Online</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{d.user?.fullName ?? '-'}</td>
                  <td className="table-td text-gray-500">
                    {d.user?.email}
                    {d.user?.phone && <div className="text-sm">{d.user.phone}</div>}
                  </td>
                  <td className="table-td text-gray-500">{d.vehicleInfo || '-'}</td>
                  <td className="table-td text-gray-500">{d.nationalId || '-'}</td>
                  <td className="table-td">
                    <span className={d.isApproved ? 'text-emerald-600' : 'text-amber-600'}>
                      {d.isApproved ? 'Approved' : 'Pending'}
                    </span>
                    {d.user?.isActive === false && (
                      <span className="ml-2 text-red-600">(Inactive)</span>
                    )}
                  </td>
                  <td className="table-td">{d.isOnline ? 'Yes' : 'No'}</td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => approve.mutate({ id: d.id, approved: !d.isApproved })}
                        disabled={approve.isPending}
                        className={`text-sm font-medium ${d.isApproved ? 'text-amber-600' : 'text-emerald-600'}`}
                      >
                        {d.isApproved ? 'Revoke' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(d)}
                        className="text-sm font-medium text-blue-600"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex justify-between">
            <p className="text-sm text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-ghost" disabled={page <= 1}>Previous</button>
              <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} className="btn-ghost" disabled={page >= pages}>Next</button>
            </div>
          </div>
        )}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add New Driver</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vehicle Info</label>
            <input
              type="text"
              value={form.vehicleInfo}
              onChange={(e) => setForm({ ...form, vehicleInfo: e.target.value })}
              placeholder="Type, color, plate number..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">National ID</label>
            <input
              type="text"
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isApproved"
              checked={form.isApproved}
              onChange={(e) => setForm({ ...form, isApproved: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isApproved" className="ml-2 block text-sm text-gray-900">
              Approved (can start working immediately)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Creating...' : 'Create Driver'}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Parameters<typeof updateDriver>[1] = {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || null,
      nationalId: form.nationalId,
      vehicleInfo: form.vehicleInfo,
      isApproved: form.isApproved,
      isActive: form.isActive,
    };
    if (form.newPassword.trim()) {
      payload.newPassword = form.newPassword.trim();
    }
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Driver</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Vehicle Info</label>
            <input
              type="text"
              value={form.vehicleInfo}
              onChange={(e) => setForm({ ...form, vehicleInfo: e.target.value })}
              placeholder="Type, color, plate number..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">National ID</label>
            <input
              type="text"
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              placeholder="Reset password..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isApproved"
                checked={form.isApproved}
                onChange={(e) => setForm({ ...form, isApproved: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isApproved" className="ml-2 block text-sm text-gray-900">
                Approved
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
