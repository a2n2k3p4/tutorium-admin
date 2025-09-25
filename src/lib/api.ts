export type Report = {
    id: number;
    class_session_id: number;
    report_date: string;
    report_reason: string;
    report_status: string;
    report_type: string;
    report_user_id: number;
    reported_user_id: number;
    report_picture?: string | null;
    report_description?: string | null;
};

const SOURCE: 'api' | 'mock' = 'api';
const BASE = SOURCE === 'api' ? '/api/proxy' : '/api/mock';

export const normalizeReport = (x: any): Report => ({
    id: x.id ?? x.ID,
    class_session_id: x.class_session_id ?? x.ClassSession?.ID ?? 0,
    report_date: x.report_date ?? x.CreatedAt ?? '',
    report_reason: x.report_reason ?? '',
    report_status: x.report_status ?? '',
    report_type: x.report_type ?? '',
    report_user_id: x.report_user_id ?? x.Reporter?.ID ?? 0,
    reported_user_id: x.reported_user_id ?? x.Reported?.ID ?? 0,
    report_picture: x.report_picture ?? null,
    report_description: x.report_description ?? null,
});

async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store', ...init });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${res.status} ${res.statusText}${body ? `: ${body}` : ''}`);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : (undefined as T));
}

export async function getReports(): Promise<Report[]> {
    const raw = await request<any[]>('/reports');
    const arr = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data))
            ? (raw as any).data
            : [];
    return arr.map(normalizeReport);
}

export async function getReport(id: number): Promise<Report | null> {
    try {
        const raw = await request<any>(`/reports/${id}`);
        return normalizeReport(raw);
    } catch {
        const list = await getReports();
        return list.find((r) => r.id === id) ?? null;
    }
}

export async function updateReportStatus(
    id: number,
    current: Report,
    nextStatus: 'approved' | 'rejected'
): Promise<Report> {
    const payload = {
        class_session_id: current.class_session_id,
        report_date: current.report_date || new Date().toISOString(),
        report_description: current.report_description ?? null,
        report_picture: current.report_picture ?? null,
        report_reason: current.report_reason,
        report_status: nextStatus,
        report_type: current.report_type,
        report_user_id: current.report_user_id,
        reported_user_id: current.reported_user_id,
    };

    const updated = await request(`/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeReport(updated);
}

export async function createReport(payload: {
    class_session_id: number;
    report_date: string;
    report_description?: string | null;
    report_picture?: string | null;
    report_reason: string;
    report_status: string;
    report_type: string;
    report_user_id: number;
    reported_user_id: number;
}): Promise<Report> {
    const raw = await request('/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeReport(raw);
}
