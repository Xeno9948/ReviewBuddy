'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Bell,
  Send,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/dashboard/queue', label: 'Queue', icon: Bell },
  { href: '/dashboard/invites', label: 'Invites', icon: Send },
  { href: '/dashboard/audit', label: 'Audit Logs', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getIsActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith?.(href);
  };

  if (!mounted) {
    return (
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="h-8 w-8 bg-slate-100 rounded-xl" />
          <span className="ml-3 font-semibold text-slate-800">ReviewBuddy</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn(
      "hidden lg:flex flex-col bg-white border-r border-slate-200 h-screen transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center">
          <Image src="/logo.png" alt="ReviewBuddy" width={32} height={32} className="h-8 w-8 rounded-xl" />
          {!collapsed && <span className="ml-3 font-semibold text-slate-800">ReviewBuddy</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = getIsActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-slate-100">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-slate-800 truncate">
              {user?.name ?? 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email ?? ''}
            </p>
          </div>
        )}
        <button
          onClick={() => signOut?.({ callbackUrl: '/login' })}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

// Mobile header for smaller screens
export function MobileHeader({ user }: SidebarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-slate-100 rounded-xl" />
          <span className="font-semibold text-slate-800">ReviewBuddy</span>
        </div>
      </header>
    );
  }

  return (
    <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-slate-200">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Image src="/logo.png" alt="ReviewBuddy" width={32} height={32} className="h-8 w-8 rounded-xl" />
        <span className="font-semibold text-slate-800">ReviewBuddy</span>
      </Link>
      <button
        onClick={() => signOut?.({ callbackUrl: '/login' })}
        className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </header>
  );
}
