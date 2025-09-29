'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    getUsers,
    getBanLearners,
    getBanTeachers,
    banLearner,
    unbanLearner,
    banTeacher,
    unbanTeacher,
    type User,
    type BanLearner,
    type BanTeacher,
} from '@/lib/api';

type RoleFilter = 'all' | 'learner' | 'teacher' | 'admin';
type StatusFilter = 'all' | 'active' | 'banned_learner' | 'banned_teacher' | 'banned_both';

const ROLE_OPTIONS: { label: string; value: RoleFilter }[] = [
    { label: 'All user', value: 'all' },
    { label: 'Learner', value: 'learner' },
    { label: 'Teacher', value: 'teacher' },
    { label: 'Admin', value: 'admin' },
];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
    { label: 'All status', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Banned Learner', value: 'banned_learner' },
    { label: 'Banned Teacher', value: 'banned_teacher' },
    { label: 'Banned Both', value: 'banned_both' },
];

const PAGE_SIZE = 10;

export default function UserPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // เก็บข้อมูล ban ที่ active พร้อม id เรคอร์ด (สำหรับ unban)
    const [learnerBanInfo, setLearnerBanInfo] = useState<Map<number, { id: number; until: Date }>>(new Map());
    const [teacherBanInfo, setTeacherBanInfo] = useState<Map<number, { id: number; until: Date }>>(new Map());

    const [role, setRole] = useState<RoleFilter>('all');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [query, setQuery] = useState('');
    const [applied, setApplied] = useState<{ role: RoleFilter; status: StatusFilter; query: string }>(
        { role: 'all', status: 'all', query: '' }
    );

    const [page, setPage] = useState(1);
    const [workingUserId, setWorkingUserId] = useState<number | null>(null); // ล็อกปุ่มขณะยิง API

    useEffect(() => {
        setLoading(true);
        setErr(null);

        Promise.all([getUsers(), getBanLearners(), getBanTeachers()])
            .then(([u, bl, bt]) => {
                setUsers(u);
                const now = new Date();
                setLearnerBanInfo(MapBanLearner(bl, now));
                setTeacherBanInfo(MapBanTeacher(bt, now));
            })
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

        const byStatus = (u: User) => {
            if (applied.status === 'all') return true;
            const info = statusInfo(u, learnerBanInfo, teacherBanInfo);
            const key: StatusFilter =
                info.text === 'Active'
                    ? 'active'
                    : info.text === 'Learner'
                        ? 'banned_learner'
                        : info.text === 'Teacher'
                            ? 'banned_teacher'
                            : 'banned_both';
            return key === applied.status;
        };

        return users
            .filter(byRole)
            .filter(byStatus)
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
    }, [users, applied, learnerBanInfo, teacherBanInfo]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const sliceStart = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);

    function onApply() {
        setApplied({ role, status, query });
        setPage(1);
    }
    function onReset() {
        setRole('all');
        setStatus('all');
        setQuery('');
        setApplied({ role: 'all', status: 'all', query: '' });
        setPage(1);
    }

    async function refreshBans() {
        const [bl, bt] = await Promise.all([getBanLearners(), getBanTeachers()]);
        const now = new Date();
        setLearnerBanInfo(MapBanLearner(bl, now));
        setTeacherBanInfo(MapBanTeacher(bt, now));
    }

    async function onBanLearner(u: User) {
        if (!u.learner_id) return;
        if (!window.confirm(`Ban learner (U${u.id}) 7 days?`)) return;
        setWorkingUserId(u.id);
        try {
            await banLearner(u.learner_id, 7);
            await refreshBans();
        } catch (e: any) {
            alert(e?.message ?? 'Failed to ban learner');
        } finally {
            setWorkingUserId(null);
        }
    }

    async function onUnbanLearner(u: User) {
        if (!u.learner_id) return;
        const info = learnerBanInfo.get(u.learner_id);
        if (!info) return;
        if (!window.confirm(`Unban learner (U${u.id}) now?`)) return;
        setWorkingUserId(u.id);
        try {
            await unbanLearner(info.id);
            await refreshBans();
        } catch (e: any) {
            alert(e?.message ?? 'Failed to unban learner');
        } finally {
            setWorkingUserId(null);
        }
    }

    async function onBanTeacher(u: User) {
        if (!u.teacher_id) return;
        if (!window.confirm(`Ban teacher (U${u.id}) 7 days?`)) return;
        setWorkingUserId(u.id);
        try {
            await banTeacher(u.teacher_id, 7);
            await refreshBans();
        } catch (e: any) {
            alert(e?.message ?? 'Failed to ban teacher');
        } finally {
            setWorkingUserId(null);
        }
    }

    async function onUnbanTeacher(u: User) {
        if (!u.teacher_id) return;
        const info = teacherBanInfo.get(u.teacher_id);
        if (!info) return;
        if (!window.confirm(`Unban teacher (U${u.id}) now?`)) return;
        setWorkingUserId(u.id);
        try {
            await unbanTeacher(info.id);
            await refreshBans();
        } catch (e: any) {
            alert(e?.message ?? 'Failed to unban teacher');
        } finally {
            setWorkingUserId(null);
        }
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
            'status',
            'student_id',
            'phone_number',
            'gender',
            'balance',
        ];
        const rows = filtered.map((u) => {
            const info = statusInfo(u, learnerBanInfo, teacherBanInfo);
            return [
                u.id,
                u.learner_id ?? '',
                u.teacher_id ?? '',
                u.admin_id ?? '',
                `${u.first_name} ${u.last_name}`,
                u.learner_flag ?? 0,
                u.teacher_flag ?? 0,
                u.ban_count ?? 0,
                info.text,
                u.student_id ?? '',
                u.phone_number ?? '',
                u.gender ?? '',
                u.balance ?? 0,
            ];
        });
        const csv = [headers.join(','), ...rows.map((r) => r.map(safeCSV).join(','))].join('\n');

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

                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusFilter)}
                    className="h-9 rounded-md border px-2 min-w-40"
                >
                    {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

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
                            <Th>Status</Th>
                            <Th className="text-center">Action</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageItems.map((u) => {
                            const info = statusInfo(u, learnerBanInfo, teacherBanInfo);
                            const isWorking = workingUserId === u.id;
                            const lInfo = u.learner_id ? learnerBanInfo.get(u.learner_id) ?? null : null;
                            const tInfo = u.teacher_id ? teacherBanInfo.get(u.teacher_id) ?? null : null;

                            return (
                                <tr key={u.id} className="border-t">
                                    <Td>{u.id}</Td>
                                    <Td>{u.learner_id ?? '-'}</Td>
                                    <Td>{u.teacher_id ?? '-'}</Td>
                                    <Td>{u.first_name} {u.last_name}</Td>
                                    <Td>{u.learner_flag ?? 0}</Td>
                                    <Td>{u.teacher_flag ?? 0}</Td>
                                    <Td>{u.ban_count ?? 0}</Td>
                                    <Td className="align-middle">{statusBadge(info.text, info.until)}</Td>
                                    <Td className="text-center">
                                        <KebabActions
                                            user={u}
                                            lInfo={lInfo}
                                            tInfo={tInfo}
                                            isWorking={isWorking}
                                            onBanLearner={onBanLearner}
                                            onUnbanLearner={onUnbanLearner}
                                            onBanTeacher={onBanTeacher}
                                            onUnbanTeacher={onUnbanTeacher}
                                        />
                                    </Td>
                                </tr>
                            );
                        })}

                        {pageItems.length === 0 && (
                            <tr>
                                <td className="px-3 py-6 text-center text-gray-500" colSpan={9}>
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

/* ---------- Small UI helpers ---------- */
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

function isActive(start?: string | null, end?: string | null, now = new Date()) {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (!s || isNaN(+s)) return false;
    if (!e || isNaN(+e)) return now >= s;
    return now >= s && now <= e;
}

function MapBanLearner(list: BanLearner[], now = new Date()) {
    const map = new Map<number, { id: number; until: Date }>();
    for (const b of list) {
        if (isActive(b.ban_start, b.ban_end, now) && Number.isFinite(Number(b.learner_id))) {
            const id = Number(b.learner_id);
            const end = b.ban_end ? new Date(b.ban_end) : null;
            if (end && !isNaN(+end)) {
                const prev = map.get(id);
                if (!prev || end > prev.until) map.set(id, { id: Number(b.id ?? 0), until: end });
            }
        }
    }
    return map;
}

function MapBanTeacher(list: BanTeacher[], now = new Date()) {
    const map = new Map<number, { id: number; until: Date }>();
    for (const b of list) {
        if (isActive(b.ban_start, b.ban_end, now) && Number.isFinite(Number(b.teacher_id))) {
            const id = Number(b.teacher_id);
            const end = b.ban_end ? new Date(b.ban_end) : null;
            if (end && !isNaN(+end)) {
                const prev = map.get(id);
                if (!prev || end > prev.until) map.set(id, { id: Number(b.id ?? 0), until: end });
            }
        }
    }
    return map;
}

function statusInfo(
    u: User,
    learnerMap: Map<number, { id: number; until: Date }>,
    teacherMap: Map<number, { id: number; until: Date }>
) {
    const lEnd = u.learner_id ? learnerMap.get(u.learner_id)?.until ?? null : null;
    const tEnd = u.teacher_id ? teacherMap.get(u.teacher_id)?.until ?? null : null;

    if (lEnd && tEnd) return { text: 'Both' as const, until: lEnd > tEnd ? lEnd : tEnd };
    if (lEnd) return { text: 'Learner' as const, until: lEnd };
    if (tEnd) return { text: 'Teacher' as const, until: tEnd };
    return { text: 'Active' as const, until: null };
}

function statusBadge(text: 'Active' | 'Learner' | 'Teacher' | 'Both', until: Date | null) {
    const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs whitespace-nowrap';
    const when = until ? (
        <div className="text-[11px] text-gray-500 mt-1 whitespace-nowrap">
            until {fmtShort(until)}
        </div>
    ) : null;

    if (text === 'Active') {
        return (
            <div className="flex flex-col items-start">
                <span className={`${base} bg-green-50 border-green-200 text-green-700`}>active</span>
            </div>
        );
    }
    if (text === 'Both') {
        return (
            <div className="flex flex-col items-start">
                <span className={`${base} bg-red-50 border-red-200 text-red-700`}>Banned Both</span>
                {when}
            </div>
        );
    }
    if (text === 'Learner') {
        return (
            <div className="flex flex-col items-start">
                <span className={`${base} bg-orange-50 border-orange-200 text-orange-700`}>Banned Learner</span>
                {when}
            </div>
        );
    }
    return (
        <div className="flex flex-col items-start">
            <span className={`${base} bg-orange-50 border-orange-200 text-orange-700`}>Banned Teacher</span>
            {when}
        </div>
    );
}

function fmtShort(d: Date) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function KebabActions({
    user,
    lInfo,
    tInfo,
    isWorking,
    onBanLearner,
    onUnbanLearner,
    onBanTeacher,
    onUnbanTeacher,
}: {
    user: User;
    lInfo: { id: number; until: Date } | null;
    tInfo: { id: number; until: Date } | null;
    isWorking: boolean;
    onBanLearner: (u: User) => Promise<void>;
    onUnbanLearner: (u: User) => Promise<void>;
    onBanTeacher: (u: User) => Promise<void>;
    onUnbanTeacher: (u: User) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!boxRef.current) return;
            if (!boxRef.current.contains(e.target as Node)) setOpen(false);
        }
        function onEsc(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('click', onDocClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, []);

    const hasAnyAction = !!user.learner_id || !!user.teacher_id;

    return (
        <div ref={boxRef} className="relative inline-block text-left">
            <button
                disabled={!hasAnyAction || isWorking}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                className="inline-flex items-center rounded px-2 py-1 border bg-white hover:bg-gray-50 disabled:opacity-50"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                ⋮
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 z-10 mt-2 w-44 origin-top-right rounded-md border bg-white shadow-lg p-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Learner actions */}
                    {user.learner_id && (
                        <button
                            role="menuitem"
                            disabled={isWorking}
                            onClick={async () => {
                                setOpen(false);
                                if (lInfo) await onUnbanLearner(user);
                                else await onBanLearner(user);
                            }}
                            className="block w-full text-left px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            {lInfo ? 'Unban Learner' : 'Ban Learner (7d)'}
                        </button>
                    )}

                    {/* Teacher actions */}
                    {user.teacher_id && (
                        <button
                            role="menuitem"
                            disabled={isWorking}
                            onClick={async () => {
                                setOpen(false);
                                if (tInfo) await onUnbanTeacher(user);
                                else await onBanTeacher(user);
                            }}
                            className="block w-full text-left px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            {tInfo ? 'Unban Teacher' : 'Ban Teacher (7d)'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
