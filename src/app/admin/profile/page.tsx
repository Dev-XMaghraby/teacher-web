
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { updatePassword, onAuthStateChanged, User, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import withAdminAuth from '@/components/withAdminAuth';
import { Loader2, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import Link from 'next/link';

const profileSchema = z.object({
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل.'),
  phone: z.string().regex(/^01[0-2,5]{1}[0-9]{8}$/, 'الرجاء إدخال رقم هاتف مصري صحيح.'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "كلمة المرور الحالية مطلوبة." }),
  newPassword: z.string().min(6, 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'كلمتا المرور الجديدتان غير متطابقتين.',
  path: ['confirmPassword'],
});

const cvSchema = z.object({
  content: z.string().min(20, 'محتوى السيرة الذاتية يجب ألا يقل عن 20 حرفًا.'),
});

const imageSchema = z.object({
  profileImage: z.any()
    .refine((files): files is FileList => files instanceof FileList && files.length > 0, 'الصورة مطلوبة.')
    .refine((files: FileList) => files?.[0]?.size <= 5000000, `أقصى حجم للملف هو 5MB.`)
    .refine(
      (files: FileList) => files?.[0]?.type && ["image/jpeg", "image/png", "image/webp"].includes(files[0].type),
      "فقط .jpg, .jpeg, .png و .webp مسموح بها."
    ),
});


type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type CvFormValues = z.infer<typeof cvSchema>;
type ImageFormValues = z.infer<typeof imageSchema>;

function AdminProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: { username: '', phone: '' } });
  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });
  const cvForm = useForm<CvFormValues>({ resolver: zodResolver(cvSchema), defaultValues: { content: '' } });
  const imageForm = useForm<ImageFormValues>({ 
    resolver: zodResolver(imageSchema)
  });
  
  const fetchInitialData = useCallback(async (currentUser: User) => {
    // Fetch user profile data
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      profileForm.reset({
        username: userData.username,
        phone: userData.phone,
      });
    }

    // Fetch settings data (CV and Image)
    const settingsDocRef = doc(db, 'settings', 'doctorInfo');
    const settingsDoc = await getDoc(settingsDocRef);
    if (settingsDoc.exists()) {
      const settingsData = settingsDoc.data();
      cvForm.reset({ content: settingsData.cvContent || '' });
      setCurrentImageUrl(settingsData.profileImageUrl || null);
    }
  }, [profileForm, cvForm]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchInitialData(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchInitialData]);

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
      toast({ title: 'نجاح', description: 'تم تحديث بيانات ملفك الشخصي.' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل تحديث البيانات.', variant: 'destructive' });
    }
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
    if (!user || !user.email) return;
    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);
      toast({ title: 'نجاح', description: 'تم تغيير كلمة المرور بنجاح.' });
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: ''});
    } catch (error) {
       toast({ title: 'خطأ', description: 'كلمة المرور الحالية غير صحيحة.', variant: 'destructive' });
    }
  };

  const onCvSubmit: SubmitHandler<CvFormValues> = async (data) => {
    try {
      await setDoc(doc(db, 'settings', 'doctorInfo'), { cvContent: data.content }, { merge: true });
      toast({ title: 'نجاح', description: 'تم حفظ محتوى السيرة الذاتية.' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل حفظ السيرة الذاتية.', variant: 'destructive' });
    }
  };
  
  const onImageSubmit: SubmitHandler<ImageFormValues> = async (data) => {
    const file = data.profileImage[0];
    if (!file) return;

    const filePath = `profileImages/doctor_profile.${file.type.split('/')[1]}`;
    const storageRef = ref(storage, filePath);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await setDoc(doc(db, 'settings', 'doctorInfo'), { profileImageUrl: downloadURL, profileImagePath: filePath }, { merge: true });
      
      setCurrentImageUrl(downloadURL);
      toast({ title: 'نجاح!', description: 'تم تحديث الصورة الشخصية بنجاح.' });
      imageForm.reset();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({ title: 'خطأ', description: 'فشل رفع الصورة.', variant: 'destructive' });
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>إدارة الصورة الشخصية</CardTitle>
                <CardDescription>
                    قم برفع وتغيير الصورة التي تظهر في الصفحة الرئيسية وصفحة السيرة الذاتية.
                </CardDescription>
              </div>
               <Button asChild variant="outline">
                    <Link href="/" target="_blank">
                        معاينة الصفحة الرئيسية
                        <ExternalLink className="mr-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">الصورة الحالية</p>
                <div className="w-44 h-44 rounded-full bg-muted flex items-center justify-center">
                   {currentImageUrl ? (
                     <Image src={currentImageUrl} alt="الصورة الشخصية" width={180} height={180} className="rounded-full w-full h-full object-cover"/>
                   ) : (
                    <ImageIcon className="w-16 h-16 text-muted-foreground/50"/>
                   )}
                </div>
            </div>
            <div className="md:col-span-2">
                 <Form {...imageForm}>
                    <form onSubmit={imageForm.handleSubmit(onImageSubmit)} className="space-y-4">
                      <FormField
                        control={imageForm.control}
                        name="profileImage"
                        render={({ field: { onChange, value, ...rest } }) => (
                          <FormItem>
                            <FormLabel>اختر صورة جديدة</FormLabel>
                            <FormControl>
                              <Input
                                type="file"
                                accept=".png, .jpg, .jpeg, .webp"
                                onChange={(e) => onChange(e.target.files)}
                                {...rest}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={imageForm.formState.isSubmitting}>
                        {imageForm.formState.isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                        رفع وحفظ الصورة
                      </Button>
                    </form>
                  </Form>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>الملف الشخصي للمسؤول</CardTitle>
          <CardDescription>تعديل بياناتك الشخصية.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField control={profileForm.control} name="username" render={({ field }) => ( <FormItem><FormLabel>اسم المستخدم</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={profileForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>رقم الهاتف</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <Button type="submit" disabled={profileForm.formState.isSubmitting}> {profileForm.formState.isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'} </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>تغيير كلمة المرور</CardTitle>
          <CardDescription>تأكد من استخدام كلمة مرور قوية.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
               <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => ( <FormItem><FormLabel>كلمة المرور الحالية</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => ( <FormItem><FormLabel>كلمة المرور الجديدة</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>تأكيد كلمة المرور الجديدة</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}> {passwordForm.formState.isSubmitting ? 'جاري التغيير...' : 'تغيير كلمة المرور'} </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>إدارة السيرة الذاتية</CardTitle>
          <CardDescription>
            قم بتعديل محتوى صفحة "السيرة الذاتية" من هنا. يمكنك استخدام الماركات مثل `**نص غامق**` و `* نص مائل*` و `-` لإنشاء قوائم.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...cvForm}>
            <form onSubmit={cvForm.handleSubmit(onCvSubmit)} className="space-y-4">
              <FormField control={cvForm.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>محتوى الصفحة</FormLabel>
                    <FormControl><Textarea {...field} rows={15} placeholder="اكتب محتوى السيرة الذاتية هنا..."/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={cvForm.formState.isSubmitting}>
                {cvForm.formState.isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                حفظ السيرة الذاتية
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

    </div>
  );
}

export default withAdminAuth(AdminProfilePage);
