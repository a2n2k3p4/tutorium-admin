'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ITEMS = [
    { href: '/', label: 'Dashboard' },
    { href: '/report', label: 'Reports' },
    { href: '/user', label: 'Users' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const txnActive = pathname === '/transaction' || pathname.startsWith('/transaction/');
    const [openTxn, setOpenTxn] = useState(txnActive);
    useEffect(() => setOpenTxn(txnActive), [txnActive]);
    const baseCls = 'block rounded px-3 py-2 text-sm';
    const activeCls = 'bg-blue-50 text-blue-700 font-medium';
    const idleCls = 'text-gray-700 hover:bg-gray-50';

    return (
        <aside className="h-screen sticky top-0 border-r bg-white p-4 w-56">
            <div className="text-lg font-bold mb-4">KUTutorium Admin</div>

            <nav className="space-y-1">
                {ITEMS.map((it) => {
                    const active = pathname === it.href || pathname.startsWith(it.href + '/');
                    return (
                        <Link
                            key={it.href}
                            href={it.href}
                            className={`${baseCls} ${active ? activeCls : idleCls}`}
                        >
                            {it.label}
                        </Link>
                    );
                })}

                <button
                    type="button"
                    onClick={() => setOpenTxn((s) => !s)}
                    aria-expanded={openTxn}
                    className={`${baseCls} w-full text-left ${txnActive ? activeCls : idleCls} flex items-center justify-between`}
                >
                    <span>Transaction</span>
                    <span className="text-xl leading-none font-medium">{openTxn ? '▾' : '▸'}</span>
                </button>

                {openTxn && (
                    <div className="space-y-1 ml-3">
                        <Link
                            href="/transaction"
                            className={`${baseCls} ${pathname.startsWith('/transaction') ? activeCls : idleCls}`}
                        >
                            Payments
                        </Link>
                    </div>
                )}
            </nav>
        </aside>
    );
}
