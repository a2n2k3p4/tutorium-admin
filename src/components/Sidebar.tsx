'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
    { href: '/', label: 'Dashboard' },
    { href: '/transaction', label: 'Transaction' },
    { href: '/report', label: 'Reports' },
    { href: '/user', label: 'Users' },
];

export default function Sidebar() {
    const pathname = usePathname();
    return (
        <aside className="h-screen sticky top-0 border-r bg-white p-4 w-56">
            <div className="text-lg font-bold mb-4">KUTutorium Admin</div>
            <nav className="space-y-1">
                {ITEMS.map((it) => {
                    const active =
                        pathname === it.href || pathname.startsWith(it.href + '/');
                    return (
                        <Link
                            key={it.href}
                            href={it.href}
                            className={
                                'block rounded px-3 py-2 text-sm ' +
                                (active
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-700 hover:bg-gray-50')
                            }
                        >
                            {it.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
