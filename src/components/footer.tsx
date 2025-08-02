import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-border/50 py-6 bg-card">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse text-foreground hover:text-primary transition-colors">
          <span className="text-2xl font-headline font-bold">
            فارس اللغة العربية
          </span>
        </Link>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} فارس اللغة العربية. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
