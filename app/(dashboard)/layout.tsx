import Sidebar from '../../src/components/Sidebar';


export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen grid grid-cols-[14rem_1fr] bg-gray-50">
            <Sidebar />
            <main className="p-6">{children}</main>
        </div>
    );
}
