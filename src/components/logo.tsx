'use client';

import Link from 'next/link';
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  
  return (
    <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse text-foreground hover:text-primary transition-colors">
      <span className="text-2xl font-headline font-bold">
        فارس اللغة العربية
      </span>
    </Link>
  );
}
