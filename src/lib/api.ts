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
    report_result?: string | null;
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
    report_result: x.report_result ?? null,
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
    nextStatus: 'approved' | 'rejected',
    resultText: string
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
        report_result: resultText,
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
    report_result?: string | null;
}): Promise<Report> {
    const raw = await request('/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return normalizeReport(raw);
}

export type User = {
    id: number;
    student_id: string;
    first_name: string;
    last_name: string;
    gender: string | null;
    phone_number: string | null;
    balance: number;
    ban_count: number;
    learner_id: number | null;
    learner_flag: number;
    teacher_id: number | null;
    teacher_flag: number;
    admin_id: number | null;
    created_at?: string;
};

export const normalizeUser = (x: any): User => ({
    id: x.id ?? x.ID,
    student_id: x.student_id ?? '',
    first_name: x.first_name ?? '',
    last_name: x.last_name ?? '',
    gender: x.gender ?? null,
    phone_number: x.phone_number ?? null,
    balance: Number(x.balance ?? 0),
    ban_count: Number(x.ban_count ?? 0),

    learner_id: x.learner_id ?? x.Learner?.ID ?? null,
    learner_flag: Number(x.learner_flag ?? x.Learner?.flag_count ?? 0),

    teacher_id: x.teacher_id ?? x.Teacher?.ID ?? null,
    teacher_flag: Number(x.teacher_flag ?? x.Teacher?.flag_count ?? 0),

    admin_id: x.admin_id ?? x.Admin?.ID ?? null,
    created_at: x.created_at ?? x.CreatedAt ?? undefined,
});

export async function getUsers(): Promise<User[]> {
    const raw = await request<any[]>('/users');
    const arr = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as any).data))
            ? (raw as any).data
            : [];
    return arr.map(normalizeUser);
}

export type BanLearner = {
    id: number;
    learner_id: number;
    ban_start: string;
    ban_end: string;
};

export type BanTeacher = {
    id: number;
    teacher_id: number;
    ban_start: string;
    ban_end: string;
};

export const normalizeBanLearner = (x: any): BanLearner => ({
    id: x.id ?? x.ID,
    learner_id: x.learner_id ?? x.Learner?.ID ?? 0,
    ban_start: x.ban_start ?? x.banStart ?? '',
    ban_end: x.ban_end ?? x.banEnd ?? '',
});

export const normalizeBanTeacher = (x: any): BanTeacher => ({
    id: x.id ?? x.ID,
    teacher_id: x.teacher_id ?? x.Teacher?.ID ?? 0,
    ban_start: x.ban_start ?? x.banStart ?? '',
    ban_end: x.ban_end ?? x.banEnd ?? '',
});

export async function getBanLearners(): Promise<BanLearner[]> {
    const raw = await request<any[]>('/banlearners');
    const arr = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object' && Array.isArray((raw as any).data))
            ? (raw as any).data
            : [];
    return arr.map(normalizeBanLearner);
}

export async function getBanTeachers(): Promise<BanTeacher[]> {
    const raw = await request<any[]>('/banteachers');
    const arr = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object' && Array.isArray((raw as any).data))
            ? (raw as any).data
            : [];
    return arr.map(normalizeBanTeacher);
}

export async function banLearner(learner_id: number, days = 7, description = ''): Promise<BanLearner> {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);

    const raw = await request('/banlearners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            learner_id,
            ban_start: now.toISOString(),
            ban_end: end.toISOString(),
            ban_description: description,
        }),
    });
    return normalizeBanLearner(raw);
}

export async function unbanLearner(banId: number): Promise<void> {
    await request(`/banlearners/${banId}`, { method: 'DELETE' });
}

export async function banTeacher(teacher_id: number, days = 7, description = ''): Promise<BanTeacher> {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);

    const raw = await request('/banteachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            teacher_id,
            ban_start: now.toISOString(),
            ban_end: end.toISOString(),
            ban_description: description,
        }),
    });
    return normalizeBanTeacher(raw);
}

export async function unbanTeacher(banId: number): Promise<void> {
    await request(`/banteachers/${banId}`, { method: 'DELETE' });
}

export type Transaction = {
    id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    charge_id: string;
    amount_satang: number;
    currency: string;
    channel: string;
    status: 'pending' | 'paid' | 'failed' | string;
    meta?: any;
};

export const normalizeTransaction = (x: any): Transaction => ({
    id: x.id ?? x.ID,
    user_id: x.user_id ?? x.UserID ?? 0,
    created_at: x.created_at ?? x.CreatedAt ?? '',
    updated_at: x.updated_at ?? x.UpdatedAt ?? '',
    charge_id: x.charge_id ?? '',
    amount_satang: Number(x.amount_satang ?? x.amount ?? 0),
    currency: x.currency ?? 'THB',
    channel: x.channel ?? '',
    status: x.status ?? '',
    meta: x.meta ?? undefined,
});

export async function getPaymentTransaction(limit = 100, offset = 0): Promise<Transaction[]> {
    const raw = await request<any>('/payments/transactions');
    const arr = Array.isArray(raw)
        ? raw
        : (raw && Array.isArray(raw.transactions))
            ? raw.transactions
            : [];
    return arr.map(normalizeTransaction);
}