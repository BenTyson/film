'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Award, Users, Plus, Clapperboard } from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Collection', icon: Clapperboard },
  { href: '/oscars', label: 'Oscars', icon: Award },
  { href: '/buddy/calen', label: 'Calen', icon: Users },
  { href: '/add', label: 'Add', icon: Plus },
];

export function Navigation() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        className="flex items-center gap-3 px-3 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Navigation Items */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                    isActive
                      ? "text-black"
                      : "text-white/70 hover:text-white"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-white/80 rounded-xl shadow-lg"
                      layoutId="activeNav"
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  )}
                  <IconComponent className="w-4 h-4 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Auth Section */}
        {isSignedIn ? (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                  userButtonPopoverCard: 'bg-black/90 backdrop-blur-xl border border-white/10',
                  userButtonPopoverActionButton: 'hover:bg-white/10',
                }
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <Link href="/sign-in">
              <motion.button
                className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white rounded-xl transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign In
              </motion.button>
            </Link>
          </div>
        )}
      </motion.div>
    </nav>
  );
}