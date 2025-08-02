
'use client';

import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  Dumbbell,
  Home,
  Info,
  Newspaper,
  Settings,
  Video,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/dashboard-header';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const sidebarNav = (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      <NavItem href="/dashboard" icon={<Home className="h-4 w-4" />} label="الرئيسية" />
      <NavItem href="/exams" icon={<ClipboardList className="h-4 w-4" />} label="الامتحانات" />
      <NavItem href="/practice" icon={<Dumbbell className="h-4 w-4" />} label="التدريبات" />
      <NavItem href="/explanations" icon={<Video className="h-4 w-4" />} label="الشروحات" />
      <NavItem href="/library" icon={<BookOpen className="h-4 w-4" />} label="المؤلفات" />
      <NavItem href="/about" icon={<Info className="h-4 w-4" />} label="عن المنصة" />
      <NavItem href="/services" icon={<Settings className="h-4 w-4" />} label="الخدمات" />
    </nav>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-l md:block bg-card">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Logo />
          </div>
          <div className="flex-1">
            {sidebarNav}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <DashboardHeader sidebarContent={
          <>
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Logo />
            </div>
            <div className="flex-1 py-4">
              {sidebarNav}
            </div>
          </>
        }/>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string; badge?: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10", isActive && "bg-primary/10 text-primary")}
    >
      {icon}
      {label}
      {badge && <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">{badge}</Badge>}
    </Link>
  );
}
