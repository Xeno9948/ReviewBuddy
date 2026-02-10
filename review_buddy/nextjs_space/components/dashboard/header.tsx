'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Settings, FileText, LogOut, User, Bell, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/dashboard/queue', label: 'Review Queue', icon: Bell },
  { href: '/dashboard/invites', label: 'Invites', icon: Send },
  { href: '/dashboard/audit', label: 'Audit Logs', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardHeaderClient({ user }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render skeleton during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full h-16 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-gray-100 rounded" />
                <span className="text-xl font-bold text-gray-900">ReviewBuddy</span>
              </div>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <span
                    key={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600"
                  >
                    <span className="h-4 w-4 inline-block" />
                    {item.label}
                  </span>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name ?? user?.email ?? 'User'}</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const getIsActive = (href: string) => {
    return pathname === href || pathname?.startsWith?.(`${href}/`);
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" alt="ReviewBuddy" width={40} height={40} className="h-10 w-10" />
              <span className="text-xl font-bold text-gray-900">ReviewBuddy</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = getIsActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.name ?? user?.email ?? 'User'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut?.({ callbackUrl: '/login' })}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
