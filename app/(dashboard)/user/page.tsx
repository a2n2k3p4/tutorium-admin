'use client';

import { useEffect, useMemo, useState } from 'react';
import { getUsers, type User } from '@/lib/api';

type RoleFilter = 'all' | 'learner' | 'teacher' | 'admin';

const ROLE_OPTIONS: { label: string; value: RoleFilter }[] = [
    { label: 'All user', value: 'all' },
    { label: 'Learner', value: 'learner' },
    { label: 'Teacher', value: 'teacher' },
    { label: 'Admin', value: 'admin' },
];

const PAGE_SIZE = 10;

export default function UserPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [role, setRole] = useState<RoleFilter>('all');
    const [query, setQuery] = useState('');
    const [applied, setApplied] = useState<{ role: RoleFilter; query: string }>({
        role: 'all',
        query: '',
    });

    const [page, setPage] = useState(1);

    useEffect(() => {
        setLoading(true);
        setErr(null);
        getUsers()
            .then(setUsers)
            .catch((e) => setErr(String(e)))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = applied.query.trim().toLowerCase();
        const byRole = (u: User) => {
            if (applied.role === 'all') return true;
            if (applied.role === 'learner') return !!u.learner_id;
            if (applied.role === 'teacher') return !!u.teacher_id;
            if (applied.role === 'admin') return !!u.admin_id;
            return true;
        };
        return users
            .filter(byRole)
            .filter((u) => {
                if (!q) return true;
                const name = `${u.first_name} ${u.last_name}`.toLowerCase();
                return (
                    name.includes(q) ||
                    String(u.id).includes(q) ||
                    String(u.student_id ?? '').toLowerCase().includes(q) ||
                    String(u.phone_number ?? '').toLowerCase().includes(q) ||
                    String(u.learner_id ?? '').includes(q) ||
                    String(u.teacher_id ?? '').includes(q)
                );
            })
            .sort((a, b) => a.id - b.id);
    }, [users, applied]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const sliceStart = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);

    function onApply() {
        setApplied({ role, query });
        setPage(1);
    }
    function onReset() {
        setRole('all');
        setQuery('');
        setApplied({ role: 'all', query: '' });
        setPage(1);
    }

    function exportCSV() {
        const headers = [
            'user_id',
            'learner_id',
            'teacher_id',
            'admin_id',
            'name',
            'learner_flag',
            'teacher_flag',
            'ban_count',
            'student_id',
            'phone_number',
            'gender',
            'balance',
        ];
        const rows = filtered.map((u) => [
            u.id,
            u.learner_id ?? '',
            u.teacher_id ?? '',
            u.admin_id ?? '',
            `${u.first_name} ${u.last_name}`,
            u.learner_flag ?? 0,
            u.teacher_flag ?? 0,
            u.ban_count ?? 0,
            u.student_id ?? '',
            u.phone_number ?? '',
            u.gender ?? '',
            u.balance ?? 0,
        ]);
        const csv =
            [headers.join(','), ...rows.map((r) => r.map(safeCSV).join(','))].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) return <div className="p-6">Loading…</div>;
    if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">KU Tutorium User management</h1>
                <button
                    onClick={exportCSV}
                    className="rounded-md border px-4 py-2 text-sm bg-white hover:bg-gray-50"
                >
                    Export
                </button>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* Role filter */}
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as RoleFilter)}
                    className="h-9 rounded-md border px-2 min-w-40"
                >
                    {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                {/* Search */}
                <div className="flex-1 min-w-56">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, IDs, phone…"
                        className="h-9 w-full rounded-md border px-3"
                    />
                </div>

                <button
                    onClick={onApply}
                    className="h-9 rounded-md bg-gray-900 text-white px-4 text-sm hover:bg-black"
                >
                    Apply
                </button>
                <button
                    onClick={onReset}
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
                            <Th>UserID</Th>
                            <Th>LearnerID</Th>
                            <Th>TeacherID</Th>
                            <Th>Name</Th>
                            <Th>learner flag</Th>
                            <Th>Teacher flag</Th>
                            <Th>Ban count</Th>
                            <Th className="text-center">Action</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageItems.map((u) => (
                            <tr key={u.id} className="border-t">
                                <Td>{u.id}</Td>
                                <Td>{u.learner_id ?? '-'}</Td>
                                <Td>{u.teacher_id ?? '-'}</Td>
                                <Td>{u.first_name} {u.last_name}</Td>
                                <Td>{u.learner_flag ?? 0}</Td>
                                <Td>{u.teacher_flag ?? 0}</Td>
                                <Td>{u.ban_count ?? 0}</Td>
                                <Td className="text-center">
                                    <button className="inline-flex items-center rounded px-2 py-1 border bg-white hover:bg-gray-50">
                                        ⋮
                                    </button>
                                </Td>
                            </tr>
                        ))}

                        {pageItems.length === 0 && (
                            <tr>
                                <td className="px-3 py-6 text-center text-gray-500" colSpan={8}>
                                    No users found
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
