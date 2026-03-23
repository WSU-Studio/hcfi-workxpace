'use client';

import { LogOut, User } from 'lucide-react';
import Image from 'next/image';
import { useState, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSidebarStore } from '@/store/useSidebarStore';
import { cn, getInitials } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { usePageTitleStore } from '@/store/usePageTitleStore';
import Card from '../ui/Card';

const Header = () => {
  const { isCollapsed } = useSidebarStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { data: session, status } = useSession();
  const userImage = session?.user?.image ?? '';
  const userName = session?.user?.name ?? 'Guest';
  const userRole = session?.user?.role ?? 'User';
  const userMenuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(userMenuRef, () => setShowUserMenu(false));
  const title = usePageTitleStore((s) => s.title);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30 transition-all duration-300',
        isCollapsed ? 'left-16' : 'left-64'
      )}
    >
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-4">
        {/* <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div> */}

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 transition-colors cursor-pointer"
          >
            {userImage ? (
              <Image src={userImage} alt="Avatar" width={40} height={40} className="rounded-full bg-gray-200" />
            ) : (
              <Avatar>{getInitials(userName)}</Avatar>
            )}
            <div className="text-left">
              {status === 'loading' ? (
                <>
                  <div className="h-5 w-24 bg-gray-300 rounded animate-pulse mb-1" />
                  <div className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <p className="font-medium">{userName}</p>
                  <p className="text-sm text-gray-500">{userRole}</p>
                </>
              )}
            </div>
          </button>

          {showUserMenu && (
            <Card className="absolute right-0 top-full mt-1 w-48 z-50 shadow-lg !p-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                onClick={() => setShowUserMenu(false)}
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <button
                onClick={() => {
                  signOut({ callbackUrl: '/login' });
                  setShowUserMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-red-600 w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </Card>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
