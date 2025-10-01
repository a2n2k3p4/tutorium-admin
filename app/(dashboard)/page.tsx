'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  getReports, getBanLearners, getBanTeachers, getPaymentTransaction, getUsers,
  type Report, type BanLearner, type BanTeacher, type Transaction, type User
} from '@/lib/api';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [banL, setBanL] = useState<BanLearner[]>([]);
  const [banT, setBanT] = useState<BanTeacher[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    Promise.all([getReports(), getBanLearners(), getBanTeachers(), getPaymentTransaction(), getUsers()])
      .then(([r, bl, bt, t, u]) => { setReports(r); setBanL(bl); setBanT(bt); setTxs(t); setUsers(u); })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  const pendingReports = reports.filter(r => (r.report_status ?? '').toLowerCase() === 'pending').length;
  const activeBans =
    banL.filter(b => isActive(b.ban_start, b.ban_end, now)).length +
    banT.filter(b => isActive(b.ban_start, b.ban_end, now)).length;

  const paidTodayTHB = useMemo(() => {
    const satang = txs
      .filter(t => (t.status ?? '').toLowerCase() === 'paid' && isSameDay(t.created_at, now))
      .reduce((s, t) => s + (t.amount_satang ?? 0), 0);
    return satang / 100;
  }, [txs]);

  const newUsersToday = useMemo(
    () => users.filter(u => (u as any).created_at && isSameDay((u as any).created_at, now)).length,
    [users]
  );

  const dailyRevenue = useDailyPaidRevenue(txs, 14);
  const userComposition = useMemo(() => {
    const teachers = users.filter(u => !!u.teacher_id).length;
    const nonTeachers = users.length - teachers;
    return [
      { name: 'Teacher', value: teachers },
      { name: 'Non-Teacher', value: nonTeachers },
    ];
  }, [users]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">KU Tutorium Dashboard</h1>

      {/*Card*/}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Pending Reports" value={pendingReports} />
        <KPICard title="Active Bans" value={activeBans} />
        <KPICard title="Paid Revenue (Today)" value={formatTHB(paidTodayTHB)} />
        <KPICard title="New Users (Today)" value={newUsersToday} />
      </div>

      {/*Daily Revenue + User Composition*/}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-lg font-semibold mb-4">Daily Net Revenue (Last 14 days)</div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={dailyRevenue} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis dataKey="label" tickMargin={8} />
                <YAxis tickFormatter={(v) => compactTHB(v)} width={70} />
                <Tooltip
                  formatter={(v: any) => formatTHB(Number(v))}
                  labelFormatter={(_, p) => {
                    const d: Date = (p && p[0]?.payload?.date) || new Date();
                    return `Date ${fmtFull(d)}`;
                  }}
                />
                <Line type="monotone" dataKey="valueTHB" stroke="#111827" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-lg font-semibold mb-4">User Composition</div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={userComposition}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="80%"
                >
                  {userComposition.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const PIE_COLORS = ['#16a34a', '#f59e0b'];

function isActive(start?: string | null, end?: string | null, now = new Date()) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s || Number.isNaN(+s)) return false;
  if (!e || Number.isNaN(+e)) return now >= s;
  return now >= s && now <= e;
}

function isSameDay(d: string | Date, ref = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  return x.getFullYear() === ref.getFullYear() &&
    x.getMonth() === ref.getMonth() &&
    x.getDate() === ref.getDate();
}

function formatTHB(n: number) {
  try { return n.toLocaleString('th-TH', { style: 'currency', currency: 'THB' }); }
  catch { return `฿${n.toFixed(2)}`; }
}
function compactTHB(n: number) {
  const nf = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  return nf.format(n);
}

function KPICard({ title, value, hint }: { title: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-gray-600 text-sm">{title}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

function useDailyPaidRevenue(txs: Transaction[], days = 14) {
  return useMemo(() => buildDailyRevenue(txs, days), [txs, days]);
}

function buildDailyRevenue(txs: Transaction[], days: number) {
  const today = startOfDay(new Date());
  const daysArr = Array.from({ length: days }, (_, i) => addDays(today, i - (days - 1)));

  const bucket = new Map<number, number>();
  for (const t of txs) {
    if ((t.status ?? '').toLowerCase() !== 'paid') continue;
    const d = startOfDay(new Date(t.created_at));
    const k = d.getTime();
    const prev = bucket.get(k) ?? 0;
    bucket.set(k, prev + (t.amount_satang ?? 0) / 100);
  }

  return daysArr.map((d) => ({
    date: d,
    label: fmtDM(d),
    valueTHB: bucket.get(d.getTime()) ?? 0,
  }));
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDM(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
function fmtFull(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
