'use client';

import { useEffect, useState } from 'react';
import {
  getReports, getBanLearners, getBanTeachers, getPaymentTransaction, getUsers,
  type Report, type BanLearner, type BanTeacher, type Transaction, type User
} from '@/lib/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [banLearners, setBanLearners] = useState<BanLearner[]>([]);
  const [banTeachers, setBanTeachers] = useState<BanTeacher[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    Promise.all([getReports(), getBanLearners(), getBanTeachers(), getPaymentTransaction(), getUsers()])
      .then(([r, bl, bt, t, u]) => {
        setReports(r);
        setBanLearners(bl);
        setBanTeachers(bt);
        setTxs(t);
        setUsers(u);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const pendingReports = reports.filter((r) => (r.report_status ?? '').toLowerCase() === 'pending').length;

  const activeBanLearners = banLearners.filter((b) => isActive(b.ban_start, b.ban_end, now)).length;
  const activeBanTeachers = banTeachers.filter((b) => isActive(b.ban_start, b.ban_end, now)).length;
  const activeBans = activeBanLearners + activeBanTeachers;

  const paidTodaySatang = txs
    .filter((t) => (t.status ?? '').toLowerCase() === 'paid' && isSameDay(t.created_at, now))
    .reduce((sum, t) => sum + (t.amount_satang ?? 0), 0);
  const paidTodayTHB = paidTodaySatang / 100;

  const newUsersToday = users.filter((u) => u.created_at && isSameDay(u.created_at, now)).length;

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">KU Tutorium Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Pending Reports" value={pendingReports} />
        <Card title="Active Bans" value={activeBans} />
        <Card title="Paid Volume (Today)" value={formatTHB(paidTodayTHB)} />
        <Card title="New Users (Today)" value={newUsersToday} />
      </div>
    </div>
  );
}

function isActive(start?: string | null, end?: string | null, now = new Date()) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s || Number.isNaN(+s)) return false;
  if (!e || Number.isNaN(+e)) return now >= s;
  return now >= s && now <= e;
}

function isSameDay(d: string | Date, ref = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return x.getFullYear() === ref.getFullYear()
    && x.getMonth() === ref.getMonth()
    && x.getDate() === ref.getDate();
}

function formatTHB(n: number) {
  try {
    return n.toLocaleString('th-TH', { style: 'currency', currency: 'THB' });
  } catch {
    return `฿${n.toFixed(2)}`;
  }
}

function Card({ title, value, hint }: { title: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-gray-600 text-sm">{title}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}
