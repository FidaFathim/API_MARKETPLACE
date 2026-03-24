import { ReactNode } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen bg-gray-100">
            <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Admin Portal</h2>
                </div>
                <div className="p-4 flex-1">
                    <ul className="space-y-4 font-medium">
                        <li>
                            <Link href="/admin" className="flex items-center p-2 text-gray-700 rounded-lg hover:bg-gray-100 group">
                                <span>📋 Pending APIs</span>
                            </Link>
                        </li>
                    </ul>
                </div>
                <div className="p-4 border-t border-gray-200">
                    <Link href="/" className="flex items-center p-2 text-blue-600 rounded-lg hover:bg-gray-100 group">
                        <span>← Back to Store</span>
                    </Link>
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}
