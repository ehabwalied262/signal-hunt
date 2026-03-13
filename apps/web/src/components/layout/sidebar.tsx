'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Phone,
  Users,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { SettingsModal } from './settings-modal';
import { LogoutModal } from './logout-modal';

const navigation = [
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Dialer', href: '/dialer', icon: Phone },
  { name: 'Import', href: '/leads/import', icon: Upload },
];

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Reports', href: '/admin/reports', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    setLogoutOpen(true);
  };

  const handleSettingsClick = () => {
    setDropdownOpen(false);
    setSettingsOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          'relative flex h-full flex-col transition-all duration-300 ease-in-out',
          collapsed ? 'w-[68px]' : 'w-64',
        )}
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {/* Logo */}
        <div
          className="flex h-16 items-center gap-2 px-4"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <Phone className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span
              className="text-lg font-bold transition-opacity duration-200"
              style={{ color: 'var(--foreground)' }}
            >
              SignalHunt
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-colors"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            color: 'var(--muted)',
          }}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-hidden px-3 py-4">
          {!collapsed && (
            <div
              className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--muted)' }}
            >
              Main
            </div>
          )}
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                )}
                style={
                  isActive
                    ? {
                        backgroundColor: 'rgba(59,130,246,0.15)',
                        color: 'var(--accent, #3b82f6)',
                      }
                    : { color: 'var(--muted)' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
                  }
                }}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              {!collapsed && (
                <div
                  className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--muted)' }}
                >
                  Admin
                </div>
              )}
              {collapsed && (
                <div
                  className="my-3 border-t"
                  style={{ borderColor: 'var(--card-border)' }}
                />
              )}
              {adminNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      collapsed && 'justify-center px-2',
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor: 'rgba(59,130,246,0.15)',
                            color: 'var(--accent, #3b82f6)',
                          }
                        : { color: 'var(--muted)' }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
                      }
                    }}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User section */}
        <div
          className="relative p-3"
          style={{ borderTop: '1px solid var(--sidebar-border)' }}
          ref={dropdownRef}
        >
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg p-2 transition-colors',
              collapsed && 'justify-center',
            )}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
            }
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: 'var(--foreground)' }}
                >
                  {user?.fullName}
                </p>
                <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                  {user?.role}
                </p>
              </div>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className={cn(
                'absolute bottom-full mb-2 rounded-xl py-1 shadow-lg',
                collapsed ? 'left-1 w-48' : 'left-3 right-3',
              )}
              style={{
                backgroundColor: 'var(--dropdown-bg)',
                border: '1px solid var(--dropdown-border)',
              }}
            >
              <button
                onClick={handleSettingsClick}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--foreground)' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
                }
              >
                <Settings className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                Settings
              </button>
              <div
                className="mx-3 border-t"
                style={{ borderColor: 'var(--card-border)' }}
              />
              <button
                onClick={handleLogoutClick}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239,68,68,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LogoutModal
        open={logoutOpen}
        onConfirm={logout}
        onCancel={() => setLogoutOpen(false)}
      />
    </>
  );
}