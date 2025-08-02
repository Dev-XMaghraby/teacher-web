'use client';

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { AuthButtons } from './auth-buttons';

export function Header() {
    const navLinks = [
        { href: '/#hero', label: 'الرئيسية' },
        { href: '/#features', label: 'خدماتنا' },
        { href: '/#levels', label: 'المراحل' },
        { href: '/#about', label: 'عن الدكتور' },
        { href: '/#contact', label: 'تواصل معنا' },
    ];
  
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container flex h-16 items-center px-4 md:px-6">
        <Logo />
        <nav className="hidden md:flex gap-6 mx-auto">
            {navLinks.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                    {link.label}
                </Link>
            ))}
        </nav>
        <AuthButtons />
      </div>
    </header>
  );
}
