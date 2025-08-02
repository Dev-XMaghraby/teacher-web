
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { auth, db } from '@/lib/firebase';

export const dynamic = 'force-dynamic'

const formSchema = z.object({
  email: z.string().email({ message: 'الرجاء إدخال بريد إلكتروني صحيح.' }),
  password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.role === 'admin') {
          toast({
              title: 'أهلاً بك أيها المدير!',
              description: 'تم تسجيل دخولك بنجاح.',
          });
          router.push('/admin/dashboard');
          return;
        }

        if (userData.status === 'pending') {
           toast({
            title: 'الحساب قيد المراجعة',
            description: 'حسابك في انتظار موافقة الإدارة. سيتم إعلامك عند تفعيله.',
            variant: 'destructive',
            duration: 10000, // Increase duration to 10 seconds
          });
          await auth.signOut();
          return;
        }
        
        toast({
          title: 'أهلاً بعودتك!',
          description: 'تم تسجيل دخولك بنجاح.',
        });
        router.push('/dashboard');

      } else {
        throw new Error("لم يتم العثور على بيانات المستخدم في قاعدة البيانات.");
      }

    } catch (error: any) {
      console.error("Error signing in:", error);
      let errorMessage = 'فشل تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      }
      toast({
        title: 'خطأ في تسجيل الدخول',
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
            <CardTitle className="text-2xl font-headline text-primary">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى حسابك</CardDescription>
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
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>كلمة المرور</FormLabel>
                        <Link href="/forgot-password" className="text-sm text-primary/80 hover:text-primary">
                          هل نسيت كلمة المرور؟
                        </Link>
                      </div>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full font-headline" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'جاري الدخول...' : 'تسجيل الدخول'}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              ليس لديك حساب؟{' '}
              <Link href="/register" className="font-bold text-primary hover:underline">
                انشاء حساب جديد
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
