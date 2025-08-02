import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <div className="bg-primary/10 rounded-full p-6 mb-6">
        <AlertTriangle className="h-24 w-24 text-primary" />
      </div>
      <h1 className="text-6xl font-extrabold text-primary font-headline">404</h1>
      <h2 className="text-3xl font-semibold text-foreground mt-4 mb-2">الصفحة غير موجودة</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        عذرًا، لم نتمكن من العثور على الصفحة التي تبحث عنها. ربما تم حذفها أو أن الرابط الذي اتبعته غير صحيح.
      </p>
      <Button asChild>
        <Link href="/">العودة إلى الصفحة الرئيسية</Link>
      </Button>
    </div>
  )
}
