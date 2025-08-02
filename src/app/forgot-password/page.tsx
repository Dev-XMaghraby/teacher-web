
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { auth } from '@/lib/firebase';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const formSchema = z.object({
  email: z.string().email({ message: 'الرجاء إدخال بريد إلكتروني صحيح.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: 'تم إرسال الرابط!',
        description: 'تفقد بريدك الإلكتروني للحصول على رابط إعادة تعيين كلمة المرور.',
      });
      router.push('/login');
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      let errorMessage = 'فشل إرسال البريد الإلكتروني. حاول مرة أخرى.';
       if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errorMessage = 'لم يتم العثور على حساب مرتبط بهذا البريد الإلكتروني.';
      }
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline text-primary">استعادة كلمة المرور</CardTitle>
            <CardDescription>أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا لإعادة التعيين.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="example@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full font-headline" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
                <Link href="/login" className="font-bold text-primary hover:underline flex items-center justify-center gap-1">
                    <ArrowRight className="h-4 w-4" />
                    العودة لتسجيل الدخول
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
