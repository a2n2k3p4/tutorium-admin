'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getReport, updateReportStatus, type Report } from '@/lib/api';

export default function ReportDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [decisionNote, setDecisionNote] = useState('');
    const [confirm, setConfirm] = useState<{ open: boolean; action: 'approve' | 'reject' | null }>({
        open: false,
        action: null,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setLoading(true);
        setErr(null);
        getReport(Number(id))
            .then((r) => {
                setReport(r);
                setDecisionNote(''); // เริ่มด้วยค่าว่างเสมอ
            })
            .catch((e) => setErr(String(e)))
            .finally(() => setLoading(false));
    }, [id]);

    const status = (report?.report_status || '').toLowerCase();
    const isPending = status === 'pending';

    async function onConfirm() {
        if (!report || !confirm.action) return;
        const note = decisionNote.trim();
        if (!note) return; // กันพลาดอีกชั้น

        setSaving(true);
        setErr(null);
        try {
            const next = confirm.action === 'approve' ? 'approved' : 'rejected';
            const updated = await updateReportStatus(report.id, report, next, note);
            setReport(updated);
            setDecisionNote(''); // เคลียร์กล่อง
        } catch (e: any) {
            setErr(e?.message ?? 'Failed to update report');
        } finally {
            setSaving(false);
            setConfirm({ open: false, action: null });
        }
    }

    const evidenceSrc = useMemo(() => {
        const p = report?.report_picture;
        if (!p) return '';
        if (p.startsWith('http') || p.startsWith('data:')) return p;
        return `data:image/png;base64,${p}`;
    }, [report?.report_picture]);

    if (loading) return <div className="p-6">Loading...</div>;
    if (err) return <div className="p-6 text-red-600">Error: {err}</div>;
    if (!report) return <div className="p-6">Report not found ID: {id}</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="rounded-lg border px-3 py-1.5 bg-white hover:bg-gray-50"
                >
                    ← Back
                </button>
                <h1 className="text-3xl font-bold">Report #{String(report.id).padStart(3, '0')}</h1>
                <span
                    className={
                        'ml-2 px-2 py-0.5 rounded text-sm capitalize ' +
                        (status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700')
                    }
                >
                    {status}
                </span>
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Detail */}
                <div className="lg:col-span-2 border rounded-xl bg-white">
                    <div className="p-5 border-b">
                        <h2 className="text-xl font-semibold">Report detail</h2>
                    </div>
                    <div className="p-5 space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Reported User" value={`U${String(report.reported_user_id).padStart(3, '0')}`} />
                            <Field label="Reported By" value={`U${String(report.report_user_id).padStart(3, '0')}`} />
                        </div>

                        <Field label="Class session" value={`CS-${String(report.class_session_id).padStart(3, '0')}`} />
                        <Field
                            label="Reported date"
                            value={report.report_date ? new Date(report.report_date).toLocaleString() : '—'}
                        />
                        <Field label="Reason" value={(report.report_reason || '').replaceAll('_', ' ')} />

                        <div>
                            <div className="font-medium mb-2">Detail</div>
                            <div className="rounded-lg border bg-gray-50 p-3 text-gray-700 whitespace-pre-wrap overflow-auto">
                                {report.report_description?.trim() || '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Evidence + Result */}
                <div className="space-y-6">
                    {/* Evidence */}
                    <div className="border rounded-xl bg-white">
                        <div className="p-5 border-b">
                            <h2 className="text-xl font-semibold">Evidence</h2>
                        </div>
                        <div className="p-5">
                            {evidenceSrc ? (
                                <img
                                    src={evidenceSrc}
                                    alt="evidence"
                                    className="w-56 h-56 object-contain border rounded-xl mx-auto"
                                />
                            ) : (
                                <div className="w-56 h-56 border rounded-xl mx-auto bg-gray-50 flex items-center justify-center text-gray-400">
                                    No image
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Result */}
                    <div className="border rounded-xl bg-white">
                        <div className="p-5 border-b">
                            <h2 className="text-xl font-semibold">Report Result</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            {isPending ? (
                                <>
                                    <textarea
                                        placeholder="Enter reason for your decision..."
                                        className="w-full h-32 rounded-lg border p-3"
                                        value={decisionNote}
                                        onChange={(e) => setDecisionNote(e.target.value)}
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setConfirm({ open: true, action: 'reject' })}
                                            className={`rounded-lg border px-4 py-2 ${decisionNote.trim() && !saving
                                                    ? 'bg-white hover:bg-red-50'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            disabled={!decisionNote.trim() || saving}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => setConfirm({ open: true, action: 'approve' })}
                                            className={`rounded-lg border px-4 py-2 ${decisionNote.trim() && !saving
                                                    ? 'bg-white hover:bg-green-50'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            disabled={!decisionNote.trim() || saving}
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <div
                                        className={
                                            'rounded-lg border p-4 ' +
                                            (status === 'approved'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-red-50 text-red-700 border-red-200')
                                        }
                                    >
                                        {/* แสดงข้อความที่บันทึกไว้จาก backend */}
                                        <div className="font-medium mb-1">Decision note</div>
                                        <div className="whitespace-pre-wrap">{report.report_result || '—'}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm modal */}
            {confirm.open && confirm.action && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
                        <h3 className="text-lg font-semibold mb-2">
                            {confirm.action === 'approve' ? 'Approve report?' : 'Reject report?'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Please confirm your decision. This action will update the report status.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirm({ open: false, action: null })}
                                className="rounded-lg border px-4 py-2 bg-white hover:bg-gray-50"
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="rounded-lg border px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                disabled={saving}
                            >
                                {saving
                                    ? 'Saving...'
                                    : confirm.action === 'approve'
                                        ? 'Confirm Approve'
                                        : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-gray-500 mb-1">{label}</div>
            <div className="text-gray-800">{value}</div>
        </div>
    );
}

function UserBadge({ id, colorClass }: { id: number; colorClass: string }) {
    return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border">
            <span className={`w-3 h-3 rounded-full ${colorClass}`} />
            <span className="text-sm">U{String(id).padStart(3, '0')}</span>
        </span>
    );
}
