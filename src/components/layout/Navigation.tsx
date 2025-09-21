'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Film, Grid, Award, Users, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Film },
  { href: '/movies', label: 'Movies', icon: Grid },
  { href: '/oscars', label: 'Oscars', icon: Award },
  { href: '/buddy/calen', label: 'Calen', icon: Users },
  { href: '/add', label: 'Add Movie', icon: Plus },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        className="flex items-center gap-2 px-4 py-3 bg-card/80 backdrop-blur-sm border border-border/50 rounded-full shadow-lg"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-primary rounded-full"
                    layoutId="activeNav"
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  />
                )}
                <IconComponent className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}