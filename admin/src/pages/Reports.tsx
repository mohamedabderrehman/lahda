import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:2007';

export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');

  const handleDownload = () => {
    const token = localStorage.getItem('lahda_admin_token');
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (status) params.set('status', status);
    const url = `${API_URL}/admin/reports/orders.csv?${params.toString()}`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'orders-report.csv');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    fetch(url, { headers })
      .then((r) => r.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'orders-report.csv';
        link.click();
      })
      .catch(() => alert('Failed to download report'));
  };

  const statuses = ['pending', 'accepted_by_merchant', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Export Orders CSV</h2>
        <p className="text-sm text-gray-500">Download a CSV report of orders with optional filters.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={handleDownload}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}
