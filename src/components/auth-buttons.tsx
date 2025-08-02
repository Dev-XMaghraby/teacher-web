'use client';

import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from './ui/button';

export function AuthButtons() {
    const { user, isAdmin } = useAuth();
    const homeHref = user ? (isAdmin ? '/admin/dashboard' : '/dashboard') : '/';

    return (
        <div className="flex items-center gap-2 ms-auto">
          {user ? (
             <Button asChild variant="default" className={cn('font-headline text-base text-primary-foreground hover:bg-primary/90')}>
                <Link href={homeHref}>لوحة التحكم</Link>
             </Button>
          ) : (
            <>
                <Button asChild variant="ghost">
                    <Link href="/login">تسجيل الدخول</Link>
                </Button>
                <Button asChild variant="default" className={cn('font-headline text-base text-primary-foreground hover:bg-primary/90')}>
                    <Link href="/register">إنشاء حساب</Link>
                </Button>
            </>
          )}
        </div>
    )
}
