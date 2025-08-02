
'use client';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  ClipboardEdit,
  Contact,
  Dumbbell,
  GraduationCap,
  Home,
  Library,
  MessageSquare,
  Settings,
  Sheet,
  Users,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Logo } from '@/components/logo';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';


export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const sidebarNav = (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      <NavItem href="/admin/dashboard" icon={<Home className="h-4 w-4" />} label="الرئيسية" />
      <NavItem href="/admin/students" icon={<Users className="h-4 w-4" />} label="إدارة الطلاب" />
      <NavItem href="/admin/exams" icon={<ClipboardEdit className="h-4 w-4" />} label="إدارة الامتحانات" />
      <NavItem href="/admin/practice" icon={<Dumbbell className="h-4 w-4" />} label="إدارة التدريبات" />
      <NavItem href="/admin/results" icon={<Award className="h-4 w-4" />} label="النتائج" />
      <NavItem href="/admin/content" icon={<Library className="h-4 w-4" />} label="إدارة المحتوى" />
      <NavItem href="/admin/messages" icon={<MessageSquare className="h-4 w-4" />} label="رسائل التواصل" />
    </nav>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-l bg-card md:block">
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
        <DashboardHeader userRole='admin' sidebarContent={
           <>
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Logo />
            </div>
            <div className="flex-1 py-4">
              {sidebarNav}
            </div>
          </>
        } />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    const pathname = usePathname();
    const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10", isActive && "bg-primary/10 text-primary")}
    >
      {icon}
      {label}
    </Link>
  );
}
