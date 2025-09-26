'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getReports, type Report } from '@/lib/api';

const REASON_OPTIONS = [
    { label: 'All reason', value: 'all' },
    { label: 'Fake review', value: 'fake_review' },
    { label: 'Absent', value: 'absent' },
    { label: 'Not teaching', value: 'not_teaching' },
    { label: 'Poor teaching', value: 'poor_teaching' },
    { label: 'Disruption', value: 'disruption' },
    { label: 'Disrespecting', value: 'disrespecting' },
    { label: 'Harassment', value: 'harassment' },
    { label: 'Bullying', value: 'bullying' },
];

const STATUS_OPTIONS = [
    { label: 'All status', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
];

const TIME_PRESETS = [
    { label: 'All time', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'This month', value: 'month' },
] as const;

type Filters = {
    query: string;
    reason: string;
    status: string;
    startDate?: string;
    endDate?: string;
    preset: typeof TIME_PRESETS[number]['value'];
};

const PAGE_SIZE = 10;

export default function ReportPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<Filters>({
        query: '',
        reason: 'all',
        status: 'all',
        preset: 'all',
        startDate: undefined,
        endDate: undefined,
    });

    const [applied, setApplied] = useState<Filters>(filters);

    // ✅ state สำหรับ pagination
    const [page, setPage] = useState(1);

    useEffect(() => {
        setLoading(true);
        setError(null);
        getReports()
            .then(setReports)
            .catch((e) => setError(String(e)))
            .finally(() => setLoading(false));
    }, []);

    function handlePresetChange(preset: Filters['preset']) {
        const today = new Date();
        const set = { preset, startDate: undefined, endDate: undefined } as Partial<Filters>;

        if (preset === 'today') {
            const d = today.toISOString().slice(0, 10);
            set.startDate = d;
            set.endDate = d;
        } else if (preset === '7d') {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 6);
            set.startDate = start.toISOString().slice(0, 10);
            set.endDate = end.toISOString().slice(0, 10);
        } else if (preset === '30d') {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 29);
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
        setFilters((prev) => ({ ...prev, ...set }));
    }

    function applyFilters() {
        setApplied(filters);
        setPage(1);
    }

    function resetFilters() {
        const init: Filters = {
            query: '',
            reason: 'all',
            status: 'all',
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

        const mapReason = (s: string) => {
            const x = s?.toLowerCase();
            if (x === 'teacher_absent') return 'absent';
            if (x === 'teacher_behavior') return 'poor_teaching';
            return x;
        };

        return reports.filter((r) => {
            if (f.query) {
                const q = f.query.toLowerCase();
                const hit =
                    String(r.id).includes(q) ||
                    String(r.report_user_id).includes(q) ||
                    String(r.reported_user_id).includes(q) ||
                    String(r.class_session_id).includes(q) ||
                    r.report_reason?.toLowerCase().includes(q) ||
                    r.report_type?.toLowerCase().includes(q) ||
                    r.report_status?.toLowerCase().includes(q);
                if (!hit) return false;
            }

            if (f.reason !== 'all') {
                if (mapReason(r.report_reason) !== f.reason) return false;
            }

            if (f.status !== 'all') {
                if (r.report_status?.toLowerCase() !== f.status) return false;
            }

            if (f.startDate) {
                const left = new Date(f.startDate);
                const d = new Date(r.report_date);
                if (d < left) return false;
            }
            if (f.endDate) {
                const right = new Date(f.endDate);
                right.setHours(23, 59, 59, 999);
                const d = new Date(r.report_date);
                if (d > right) return false;
            }

            return true;
        });
    }, [reports, applied]);

    const sorted = useMemo(() => {
        const toTime = (s: string) => {
            const t = Date.parse(s);
            return Number.isNaN(t) ? 0 : t;
        };
        return [...filtered].sort((a, b) => toTime(b.report_date) - toTime(a.report_date));
    }, [filtered]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * PAGE_SIZE;
    const pageItems = sorted.slice(start, start + PAGE_SIZE);

    useEffect(() => {
        if (page !== clampedPage) setPage(clampedPage);
    }, [clampedPage, page]);

    function exportCSV() {
        const headers = [
            'id',
            'report_user_id',
            'reported_user_id',
            'class_session_id',
            'report_type',
            'report_reason',
            'report_status',
            'report_date',
        ];
        const rows = sorted.map((r) => [
            r.id,
            r.report_user_id,
            r.reported_user_id,
            r.class_session_id,
            r.report_type,
            r.report_reason,
            r.report_status,
            r.report_date,
        ]);
        const csv = [headers.join(','), ...rows.map((row) => row.map(safeCSV).join(','))].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reports_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) return <div className="p-6">Loading…</div>;
    if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">KU Tutorium Report management</h1>
                <button onClick={exportCSV} className="rounded-md border px-4 py-2 text-sm bg-white hover:bg-gray-50">
                    Export
                </button>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* Date range */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">From</label>
                    <input
                        type="date"
                        value={filters.startDate ?? ''}
                        onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value, preset: 'all' }))}
                        className="h-9 rounded-md border px-2"
                    />
                    <label className="text-sm text-gray-600">to</label>
                    <input
                        type="date"
                        value={filters.endDate ?? ''}
                        onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value, preset: 'all' }))}
                        className="h-9 rounded-md border px-2"
                    />
                </div>

                {/* Time preset */}
                <select
                    value={filters.preset}
                    onChange={(e) => handlePresetChange(e.target.value as Filters['preset'])}
                    className="h-9 rounded-md border px-2"
                >
                    {TIME_PRESETS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                {/* Reason */}
                <select
                    value={filters.reason}
                    onChange={(e) => setFilters((p) => ({ ...p, reason: e.target.value }))}
                    className="h-9 rounded-md border px-2 min-w-40"
                >
                    {REASON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                {/* Status */}
                <select
                    value={filters.status}
                    onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                    className="h-9 rounded-md border px-2"
                >
                    {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                {/* Search */}
                <div className="flex-1 min-w-56">
                    <input
                        value={filters.query}
                        onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
                        placeholder="Search"
                        className="h-9 w-full rounded-md border px-3"
                    />
                </div>

                <button onClick={applyFilters} className="h-9 rounded-md bg-gray-900 text-white px-4 text-sm hover:bg-black">
                    Apply
                </button>
                <button onClick={resetFilters} className="h-9 rounded-md border px-4 text-sm bg-white hover:bg-gray-50">
                    Reset
                </button>
            </div>

            {/* Table */}
            <div className="overflow-auto rounded-md border bg-white">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <Th>ID</Th>
                            <Th>ReporterID</Th>
                            <Th>ReportedUserID</Th>
                            <Th>ClassSessionID</Th>
                            <Th>Reason</Th>
                            <Th>Status</Th>
                            <Th>Date</Th>
                            <Th className="text-center">Action</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageItems.map((r) => (
                            <tr key={r.id} className="border-t">
                                <Td>{r.id}</Td>
                                <Td>{r.report_user_id}</Td>
                                <Td>{r.reported_user_id}</Td>
                                <Td>{r.class_session_id}</Td>
                                <Td className="capitalize">{(r.report_reason || '').replaceAll('_', ' ')}</Td>
                                <Td className="capitalize">{r.report_status}</Td>
                                <Td>{r.report_date ? new Date(r.report_date).toLocaleString() : '—'}</Td>
                                <Td className="text-center">
                                    <Link
                                        href={`/report/${r.id}`}
                                        className="inline-block rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                                    >
                                        View
                                    </Link>
                                </Td>
                            </tr>
                        ))}

                        {pageItems.length === 0 && (
                            <tr>
                                <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>
                                    No reports found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination
                page={page}
                totalPages={totalPages}
                onChange={(p) => setPage(p)}
                totalItems={sorted.length}
                pageSize={PAGE_SIZE}
            />
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

function Pagination({
    page,
    totalPages,
    onChange,
    totalItems,
    pageSize,
}: {
    page: number;
    totalPages: number;
    onChange: (p: number) => void;
    totalItems: number;
    pageSize: number;
}) {
    if (totalPages <= 1) {
        return (
            <div className="flex items-center justify-between text-sm text-gray-600">
                <div>Showing {Math.min(totalItems, pageSize)} of {totalItems} items</div>
            </div>
        );
    }

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems);

    const pages: (number | '…')[] = [];
    const push = (v: number | '…') => pages.push(v);

    const windowSize = 2;
    const start = Math.max(1, page - windowSize);
    const end = Math.min(totalPages, page + windowSize);

    if (start > 1) {
        push(1);
        if (start > 2) push('…');
    }
    for (let p = start; p <= end; p++) push(p);
    if (end < totalPages) {
        if (end < totalPages - 1) push('…');
        push(totalPages);
    }

    return (
        <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-gray-600 px-1">
                Showing {from}-{to} of {totalItems}
            </div>
            <div className="flex items-center gap-1">
                <button
                    className="px-3 py-1 rounded border bg-white disabled:opacity-50"
                    onClick={() => onChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                >
                    Prev
                </button>

                {pages.map((p, i) =>
                    p === '…' ? (
                        <span key={`e-${i}`} className="px-2 text-gray-500">
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onChange(p)}
                            className={`px-3 py-1 rounded border ${p === page ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50'
                                }`}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    className="px-3 py-1 rounded border bg-white disabled:opacity-50"
                    onClick={() => onChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
