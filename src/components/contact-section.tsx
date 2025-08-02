'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Phone, Mail, MapPin } from 'lucide-react';
import { sendContactMessage } from '@/app/actions';

const contactFormSchema = z.object({
  name: z.string().min(3, 'الاسم مطلوب.'),
  email: z.string().email('بريد إلكتروني غير صحيح.'),
  message: z.string().min(10, 'الرسالة يجب أن تكون 10 أحرف على الأقل.'),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function ContactSection() {
  const { toast } = useToast();
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
        name: '',
        email: '',
        message: '',
    }
  });

  async function onSubmit(data: ContactFormValues) {
    try {
      const result = await sendContactMessage(data);

      if (result.success) {
          toast({
            title: 'تم إرسال رسالتك بنجاح!',
            description: 'شكرًا لتواصلك معنا، سنقوم بالرد في أقرب وقت ممكن.',
          });
          form.reset();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
       console.error("Error sending message: ", error);
       toast({
        title: 'خطأ في الإرسال',
        description: 'حدث خطأ أثناء محاولة إرسال رسالتك. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  }

  return (
    <section id="contact" className="py-12 md:py-24 bg-card">
        <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-4">
                تواصل معنا
                </h2>
                <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
                نسعد باستقبال استفساراتكم ومقترحاتكم. يمكنكم التواصل معنا عبر النموذج أو المعلومات أدناه.
                </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12">
                <Card className="bg-background">
                <CardHeader>
                    <CardTitle>أرسل لنا رسالة</CardTitle>
                    <CardDescription>املأ النموذج التالي وسيقوم فريقنا بالرد عليك.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>الاسم الكامل</FormLabel>
                            <FormControl><Input placeholder="اسمك..." {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>البريد الإلكتروني</FormLabel>
                            <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>رسالتك</FormLabel>
                            <FormControl><Textarea placeholder="اكتب رسالتك هنا..." {...field} rows={5} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                        </Button>
                    </form>
                    </Form>
                </CardContent>
                </Card>
                
                <div className="space-y-8">
                <Card className="bg-background">
                    <CardHeader>
                    <CardTitle>معلومات الاتصال</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-lg">
                    <div className="flex items-center gap-4">
                        <Phone className="h-6 w-6 text-primary" />
                        <div className="flex flex-col items-start" dir="ltr">
                            <span>01096923771</span>
                            <span>01144089686</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Mail className="h-6 w-6 text-primary" />
                        <span>sayedheshmat51@gmail.com</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <MapPin className="h-6 w-6 text-primary" />
                        <span>جمهورية مصر العربية - محافظة قنا</span>
                    </div>
                    </CardContent>
                </Card>
                </div>
            </div>
        </div>
    </section>
  );
}
