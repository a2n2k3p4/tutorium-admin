'use client';

import { useEffect, useMemo, useState } from 'react';
import { getPaymentTransaction, type Transaction } from '@/lib/api';

type Status = 'all' | 'paid' | 'pending' | 'failed';
type Channel = 'all' | 'card' | 'promptpay' | 'bank_transfer' | 'other';

const STATUS_OPTIONS: { label: string; value: Status }[] = [
    { label: 'All status', value: 'all' },
    { label: 'Paid', value: 'paid' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
];

const CHANNEL_OPTIONS: { label: string; value: Channel }[] = [
    { label: 'All channels', value: 'all' },
    { label: 'Card', value: 'card' },
    { label: 'PromptPay', value: 'promptpay' },
    { label: 'Bank transfer', value: 'bank_transfer' },
    { label: 'Other', value: 'other' },
];

const TIME_PRESETS = [
    { label: 'All time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'This month', value: 'month' },
] as const;

const PAGE_SIZE = 10;

type Filters = {
    query: string;
    status: Status;
    channel: Channel;
    startDate?: string;
    endDate?: string;
    preset: typeof TIME_PRESETS[number]['value'];
};

export default function PaymentsPage() {
    const [rows, setRows] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [filters, setFilters] = useState<Filters>({
        query: '',
        status: 'all',
        channel: 'all',
        preset: 'all',
        startDate: undefined,
        endDate: undefined,
    });
    const [applied, setApplied] = useState<Filters>(filters);

    const [page, setPage] = useState(1);

    useEffect(() => {
        setLoading(true);
        setErr(null);
        getPaymentTransaction()
            .then(setRows)
            .catch((e) => setErr(String(e)))
            .finally(() => setLoading(false));
    }, []);

    function handlePresetChange(preset: Filters['preset']) {
        const today = new Date();
        const set: Partial<Filters> = { preset, startDate: undefined, endDate: undefined };

        if (preset === 'today') {
            const d = today.toISOString().slice(0, 10);
            set.startDate = d; set.endDate = d;
        } else if (preset === '7d') {
            const end = new Date();
            const start = new Date(); start.setDate(end.getDate() - 6);
            set.startDate = start.toISOString().slice(0, 10);
            set.endDate = end.toISOString().slice(0, 10);
        } else if (preset === '30d') {
            const end = new Date();
            const start = new Date(); start.setDate(end.getDate() - 29);
            set.startDate = start.toISOString().slice(0, 10);
            set.endDate = end.toISOString().slice(0, 10);
        } else if (preset === 'month') {
            const y = today.getFullYear();
            const m = today.getMonth();
            const start = new Date(y, m, 1);
            const end = new Date(y, m + 1, 0);
            set.startDate = start.toISOString().slice(0, 10);
            set.endDate = end.toISOString().slice(0, 10);
        }
        setFilters((p) => ({ ...p, ...set }));
    }

    function applyFilters() {
        setApplied(filters);
        setPage(1);
    }
    function resetFilters() {
        const init: Filters = {
            query: '',
            status: 'all',
            channel: 'all',
            preset: 'all',
            startDate: undefined,
            endDate: undefined,
        };
        setFilters(init);
        setApplied(init);
        setPage(1);
    }

    const filtered = useMemo(() => {
        const f = applied;

        return rows
            .filter((r) => {
                if (!f.query) return true;
                const q = f.query.toLowerCase();
                const hit =
                    String(r.id).includes(q) ||
                    String(r.user_id).includes(q) ||
                    (r.charge_id ?? '').toLowerCase().includes(q);
                return hit;
            })
            .filter((r) => (f.status === 'all' ? true : r.status.toLowerCase() === f.status))
            .filter((r) => {
                if (f.channel === 'all') return true;
                const ch = r.channel?.toLowerCase() || '';
                if (f.channel === 'other') return !['card', 'promptpay', 'bank_transfer'].includes(ch);
                return ch === f.channel;
            })
            .filter((r) => {
                if (!f.startDate && !f.endDate) return true;
                const d = new Date(r.created_at);
                if (f.startDate) {
                    const left = new Date(f.startDate);
                    if (d < left) return false;
                }
                if (f.endDate) {
                    const right = new Date(f.endDate);
                    right.setHours(23, 59, 59, 999);
                    if (d > right) return false;
                }
                return true;
            })
            .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }, [rows, applied]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const sliceStart = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);

    function exportCSV() {
        const headers = [
            'id',
            'user_id',
            'charge_id',
            'amount_thb',
            'currency',
            'channel',
            'status',
            'failure_code',
            'failure_message',
            'created_at',
        ];
        const rows = filtered.map((t) => [
            t.id,
            t.user_id,
            t.charge_id ?? '',
            (t.amount_satang ?? 0) / 100,
            t.currency ?? 'THB',
            t.channel ?? '',
            t.status ?? '',
            t.created_at,
        ]);
        const csv = [headers.join(','), ...rows.map((r) => r.map(safeCSV).join(','))].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) return <div className="p-6">Loading…</div>;
    if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">KU Tutorium Payment Transaction</h1>
                <button
                    onClick={exportCSV}
                    className="rounded-md border px-4 py-2 text-sm bg-white hover:bg-gray-50"
                >
                    Export
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* Date range */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">From</label>
                    <input
                        type="date"
                        className="h-9 rounded-md border px-2"
                        value={filters.startDate ?? ''}
                        onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value, preset: 'all' }))}
                    />
                    <label className="text-sm text-gray-600">to</label>
                    <input
                        type="date"
                        className="h-9 rounded-md border px-2"
                        value={filters.endDate ?? ''}
                        onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value, preset: 'all' }))}
                    />
                </div>

                {/* Time preset */}
                <select
                    value={filters.preset}
                    onChange={(e) => handlePresetChange(e.target.value as Filters['preset'])}
                    className="h-9 rounded-md border px-2"
                >
                    {TIME_PRESETS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Status */}
                <select
                    value={filters.status}
                    onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as Status }))}
                    className="h-9 rounded-md border px-2"
                >
                    {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Channel */}
                <select
                    value={filters.channel}
                    onChange={(e) => setFilters((p) => ({ ...p, channel: e.target.value as Channel }))}
                    className="h-9 rounded-md border px-2"
                >
                    {CHANNEL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Search */}
                <div className="flex-1 min-w-56">
                    <input
                        value={filters.query}
                        onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
                        placeholder="Search by transaction ID, user ID, charge ID"
                        className="h-9 w-full rounded-md border px-3"
                    />
                </div>

                <button
                    onClick={applyFilters}
                    className="h-9 rounded-md bg-gray-900 text-white px-4 text-sm hover:bg-black"
                >
                    Apply
                </button>
                <button
                    onClick={resetFilters}
                    className="h-9 rounded-md border px-4 text-sm bg-white hover:bg-gray-50"
                >
                    Reset
                </button>
            </div>

            {/* Table */}
            <div className="overflow-auto rounded-md border bg-white">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <Th>ID</Th>
                            <Th>User</Th>
                            <Th>Charge ID</Th>
                            <Th>Amount</Th>
                            <Th>Channel</Th>
                            <Th>Status</Th>
                            <Th>Created</Th>
                            <Th>Failure</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageItems.map((t) => (
                            <tr key={t.id} className="border-t">
                                <Td>{t.id}</Td>
                                <Td>{t.user_id}</Td>
                                <Td className="font-mono">{t.charge_id}</Td>
                                <Td>{formatTHB((t.amount_satang ?? 0) / 100)}</Td>
                                <Td className="capitalize">{(t.channel || '').replace('_', ' ')}</Td>
                                <Td>{statusBadge(t.status)}</Td>
                                <Td>{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</Td>
                            </tr>
                        ))}

                        {pageItems.length === 0 && (
                            <tr>
                                <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>
                                    No transactions found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-2 justify-end">
                <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="rounded border bg-white px-3 py-1.5 text-sm disabled:opacity-50"
                >
                    Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`rounded border px-3 py-1.5 text-sm ${p === currentPage ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'
                            }`}
                    >
                        {p}
                    </button>
                ))}

                <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded border bg-white px-3 py-1.5 text-sm disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

function Th({ children, className = '' }: any) {
    return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: any) {
    return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}

function safeCSV(v: unknown) {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}
function formatTHB(n: number) {
    try { return n.toLocaleString('th-TH', { style: 'currency', currency: 'THB' }); }
    catch { return `฿${n.toFixed(2)}`; }
}
function statusBadge(status: string) {
    const s = (status || '').toLowerCase();
    const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs';
    if (s === 'paid' || s === 'successful')
        return <span className={`${base} bg-green-50 border-green-200 text-green-700`}>paid</span>;
    if (s === 'pending')
        return <span className={`${base} bg-yellow-50 border-yellow-200 text-yellow-700`}>pending</span>;
    if (s === 'failed')
        return <span className={`${base} bg-red-50 border-red-200 text-red-700`}>failed</span>;
    return <span className={`${base} bg-gray-50 border-gray-200 text-gray-700`}>{status || '—'}</span>;
}
