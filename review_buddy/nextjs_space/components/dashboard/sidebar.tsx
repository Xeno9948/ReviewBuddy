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
      <aside className="hidden lg:flex flex-col w-72 glass border-r border-apple-border h-screen fixed z-50">
        <div className="h-20 flex items-center px-8 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-start to-brand-end flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-slate-800">ReviewBuddy</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn(
      "hidden lg:flex flex-col border-r border-apple-border h-screen transition-all duration-300 fixed z-50 glass",
      collapsed ? "w-24" : "w-72"
    )}>
      {/* Logo */}
      <div className={cn("h-24 flex items-center px-8 pt-6", collapsed && "justify-center px-0")}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-start to-brand-end flex items-center justify-center shadow-lg shadow-brand-end/20">
            {collapsed ? <span className="text-white font-bold text-xl">R</span> : <Image src="/logo.png" alt="R" width={24} height={24} className="w-6 h-6 brightness-0 invert" />}
          </div>
          {!collapsed && <span className="text-xl font-semibold tracking-tight text-slate-800">ReviewBuddy</span>}
        </Link>
      </div>

      <div className="flex justify-end px-4 mb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-full hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = getIsActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-3xl transition-all duration-300 group",
                isActive
                  ? "bg-gradient-to-r from-brand-start to-brand-end text-white shadow-lg shadow-brand-end/20"
                  : "text-slate-500 hover:bg-white/50 hover:text-slate-900",
                collapsed && "justify-center px-0 w-12 h-12 mx-auto"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
              {!collapsed && <span className="font-medium tracking-wide text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-6 mt-auto">
        {!collapsed ? (
          <div className="flex items-center gap-4 bg-white/40 p-3 rounded-3xl border border-white/50 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-semibold">
              {user.name?.[0] ?? 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium truncate">Administrator</p>
            </div>
            <button
              onClick={() => signOut?.({ callbackUrl: '/login' })}
              className="text-slate-400 hover:text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signOut?.({ callbackUrl: '/login' })}
            className="w-12 h-12 rounded-full bg-white/40 flex items-center justify-center mx-auto hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all border border-white/50"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
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
      <header className="lg:hidden flex items-center justify-between h-16 px-6 glass fixed w-full top-0 z-40 border-b border-apple-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-start to-brand-end flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-semibold text-slate-800">ReviewBuddy</span>
        </div>
      </header>
    );
  }

  return (
    <header className="lg:hidden flex items-center justify-between h-16 px-6 glass fixed w-full top-0 z-40 border-b border-apple-border">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-start to-brand-end flex items-center justify-center shadow-md">
          <Image src="/logo.png" alt="R" width={20} height={20} className="w-5 h-5 brightness-0 invert" />
        </div>
        <span className="font-semibold text-slate-800 tracking-tight">ReviewBuddy</span>
      </Link>
      <button
        onClick={() => signOut?.({ callbackUrl: '/login' })}
        className="p-2 rounded-full hover:bg-black/5 text-slate-500 transition-colors"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </header>
  );
}
