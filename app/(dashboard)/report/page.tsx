'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getReports, type Report } from '@/lib/api';

export default function ReportPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        getReports()
            .then(setReports)
            .catch((e) => setError(String(e)))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="">
            <h1 className="text-xl font-bold mb-4">Reports</h1>

            {loading && <div className="mb-3">Loading...</div>}
            {error && <div className="mb-3 text-red-600">Error: {error}</div>}

            <div className="overflow-x-auto">
                <table className="table-auto border-collapse border border-gray-300 w-full text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border px-3 py-2">ID</th>
                            <th className="border px-3 py-2">Reporter</th>
                            <th className="border px-3 py-2">Reported User</th>
                            <th className="border px-3 py-2">Class Session</th>
                            <th className="border px-3 py-2">Reason</th>
                            <th className="border px-3 py-2">Status</th>
                            <th className="border px-3 py-2">Date</th>
                            <th className="border px-3 py-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((r, i) => (
                            <tr key={r.id ?? `row-${i}`}>
                                <td className="border px-3 py-2">{r.id}</td>
                                <td className="border px-3 py-2">{r.report_user_id}</td>
                                <td className="border px-3 py-2">{r.reported_user_id}</td>
                                <td className="border px-3 py-2">{r.class_session_id}</td>
                                <td className="border px-3 py-2">{r.report_reason}</td>
                                <td className="border px-3 py-2">{r.report_status}</td>
                                <td className="border px-3 py-2">
                                    {r.report_date ? new Date(r.report_date).toLocaleString() : '—'}
                                </td>
                                <td className="border px-3 py-2 text-center">
                                    <Link
                                        href={`/report/${r.id}`}
                                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 inline-block"
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}

                        {!loading && !error && reports.length === 0 && (
                            <tr>
                                <td className="border px-3 py-6 text-center text-gray-500" colSpan={8}>
                                    No data
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
