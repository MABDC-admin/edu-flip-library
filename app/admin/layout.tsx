'use client'

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from "next-auth/react";
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    Users,
    LayoutDashboard,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/sonner";

interface AdminLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/books', label: 'Manage Books', icon: BookOpen },
    { href: '/admin/students', label: 'Students', icon: Users },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push('/api/auth/signin');
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile menu button */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
            </div>

            {/* Sidebar overlay */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-0 left-0 h-full w-64 bg-card border-r z-50 transform transition-transform duration-300",
                "lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b">
                        <Link href="/admin" className="flex items-center gap-3">
                            <div className="flex items-center gap-2 mb-8 px-2">
                                <div className="bg-slate-900/10 dark:bg-white/10 p-2 rounded-lg">
                                    <LayoutDashboard className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-foreground">MABDC</h1>
                                    <p className="text-xs text-muted-foreground">Admin Portal</p>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-semibold text-primary">
                                    {session.user?.name?.charAt(0).toUpperCase() || "A"}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{session.user?.name || "Admin"}</p>
                                <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => signOut()}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="lg:ml-64 min-h-screen p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}
