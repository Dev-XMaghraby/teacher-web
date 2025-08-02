
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { GRADE_LEVELS } from '@/lib/client-constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Youtube, Book, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import withAdminAuth from '@/components/withAdminAuth';


// Schemas
const explanationSchema = z.object({
  title: z.string().min(3, 'العنوان مطلوب.'),
  description: z.string().optional(),
  videoUrl: z.string().url('رابط يوتيوب غير صحيح.').refine(url => url.includes('youtube.com') || url.includes('youtu.be'), 'يجب أن يكون الرابط من يوتيوب.'),
  grade: z.string({ required_error: 'الرجاء اختيار الصف الدراسي.' }),
});

const librarySchema = z.object({
  title: z.string().min(3, 'العنوان مطلوب.'),
  description: z.string().optional(),
  grade: z.string({ required_error: 'الرجاء اختيار الصف الدراسي.' }),
  file: z.any().refine(files => files?.length === 1, 'الملف مطلوب.').refine(files => files?.[0]?.type === 'application/pdf', 'يجب أن يكون الملف من نوع PDF.'),
});

type ExplanationFormValues = z.infer<typeof explanationSchema>;
type LibraryFormValues = z.infer<typeof librarySchema>;

interface Explanation extends ExplanationFormValues {
  id: string;
}
interface LibraryFile extends Omit<LibraryFormValues, 'file'> {
  id: string;
  fileUrl: string;
  filePath: string;
}

function AdminContentPage() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('explanations');

    const [explanations, setExplanations] = useState<Explanation[]>([]);
    const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
    
    const [loadingExplanations, setLoadingExplanations] = useState(true);
    const [loadingLibrary, setLoadingLibrary] = useState(true);

    const [isExplanationDialogOpen, setExplanationDialogOpen] = useState(false);
    const [isLibraryDialogOpen, setLibraryDialogOpen] = useState(false);
    
    const explanationForm = useForm<ExplanationFormValues>({ 
        resolver: zodResolver(explanationSchema),
        defaultValues: {
            title: '',
            description: '',
            videoUrl: '',
        }
    });
    const libraryForm = useForm<LibraryFormValues>({ 
        resolver: zodResolver(librarySchema),
        defaultValues: {
            title: '',
            description: '',
            file: undefined,
        }
    });

    const fetchExplanations = useCallback(async () => {
        setLoadingExplanations(true);
        try {
            const q = query(collection(db, 'explanations'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            setExplanations(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Explanation)));
        } catch (e) {
            toast({ title: 'خطأ', description: 'فشل في جلب الشروحات.', variant: 'destructive' });
        } finally {
            setLoadingExplanations(false);
        }
    }, [toast]);

    const fetchLibraryFiles = useCallback(async () => {
        setLoadingLibrary(true);
        try {
            const q = query(collection(db, 'library'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            setLibraryFiles(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryFile)));
        } catch (e) {
            toast({ title: 'خطأ', description: 'فشل في جلب ملفات المكتبة.', variant: 'destructive' });
        } finally {
            setLoadingLibrary(false);
        }
    }, [toast]);

    useEffect(() => {
        if (activeTab === 'explanations') fetchExplanations();
        if (activeTab === 'library') fetchLibraryFiles();
    }, [activeTab, fetchExplanations, fetchLibraryFiles]);

    const onExplanationSubmit: SubmitHandler<ExplanationFormValues> = async (data) => {
        try {
            await addDoc(collection(db, 'explanations'), { 
              title: data.title,
              description: data.description,
              videoUrl: data.videoUrl,
              grade: data.grade,
              createdAt: serverTimestamp() 
            });
            toast({ title: 'نجاح', description: 'تمت إضافة الشرح بنجاح.' });
            explanationForm.reset();
            setExplanationDialogOpen(false);
            fetchExplanations();
        } catch (e) {
            toast({ title: 'خطأ', description: 'فشل إضافة الشرح.', variant: 'destructive' });
        }
    };

    const onLibrarySubmit: SubmitHandler<LibraryFormValues> = async (data) => {
        const file = data.file[0];
        if (!file) return;

        const filePath = `library/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, filePath);
        
        try {
            const uploadTask = await uploadBytes(storageRef, file);
            const fileUrl = await getDownloadURL(uploadTask.ref);

            await addDoc(collection(db, 'library'), {
                title: data.title,
                description: data.description,
                grade: data.grade,
                fileUrl,
                filePath,
                createdAt: serverTimestamp(),
            });

            toast({ title: 'نجاح', description: 'تم رفع الملف وإضافته للمكتبة.' });
            libraryForm.reset();
            setLibraryDialogOpen(false);
            fetchLibraryFiles();
        } catch (e) {
            console.error(e);
            toast({ title: 'خطأ', description: 'فشل رفع الملف.', variant: 'destructive' });
        }
    };
    
    const handleDeleteExplanation = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'explanations', id));
            toast({ title: 'نجاح', description: 'تم حذف الشرح.' });
            fetchExplanations();
        } catch (e) {
            toast({ title: 'خطأ', description: 'فشل حذف الشرح.', variant: 'destructive' });
        }
    };

    const handleDeleteLibraryFile = async (file: LibraryFile) => {
        try {
            await deleteDoc(doc(db, 'library', file.id));
            const fileRef = ref(storage, file.filePath);
            await deleteObject(fileRef);
            toast({ title: 'نجاح', description: 'تم حذف الملف.' });
            fetchLibraryFiles();
        } catch (e) {
             toast({ title: 'خطأ', description: 'فشل حذف الملف.', variant: 'destructive' });
        }
    };
    
    const getGradeLabel = (value: string) => GRADE_LEVELS.find(level => level.value === value)?.label || value;

    const renderSkeleton = () => (
        Array.from({ length: 2 }).map((_, index) => (
          <TableRow key={`skeleton-${index}`}>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
          </TableRow>
        ))
      );

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-lg font-semibold md:text-2xl font-headline">إدارة المحتوى</h1>
                {activeTab === 'explanations' && (
                     <Dialog open={isExplanationDialogOpen} onOpenChange={(open) => {
                        setExplanationDialogOpen(open);
                        if (!open) explanationForm.reset();
                     }}>
                        <DialogTrigger asChild>
                            <Button><Youtube className="ml-2 h-4 w-4" /> إضافة شرح جديد</Button>
                        </DialogTrigger>
                        <DialogContent>
                             <Form {...explanationForm}>
                                <form onSubmit={explanationForm.handleSubmit(onExplanationSubmit)} className="space-y-4">
                                     <DialogHeader>
                                        <DialogTitle>إضافة شرح جديد (فيديو)</DialogTitle>
                                        <DialogDescription>أدخل تفاصيل الشرح ورابط الفيديو من يوتيوب.</DialogDescription>
                                    </DialogHeader>
                                    <FormField control={explanationForm.control} name="title" render={({ field }) => (
                                        <FormItem><FormLabel>العنوان</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={explanationForm.control} name="description" render={({ field }) => (
                                        <FormItem><FormLabel>الوصف</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={explanationForm.control} name="videoUrl" render={({ field }) => (
                                        <FormItem><FormLabel>رابط الفيديو (يوتيوب)</FormLabel><FormControl><Input {...field} placeholder="https://www.youtube.com/watch?v=..." /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={explanationForm.control} name="grade" render={({ field }) => (
                                         <FormItem>
                                            <FormLabel>الصف الدراسي</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="اختر الصف" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {GRADE_LEVELS.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <DialogFooter>
                                        <Button type="button" variant="secondary" onClick={() => setExplanationDialogOpen(false)}>إلغاء</Button>
                                        <Button type="submit" disabled={explanationForm.formState.isSubmitting}>
                                            {explanationForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'حفظ الشرح'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                )}
                 {activeTab === 'library' && (
                     <Dialog open={isLibraryDialogOpen} onOpenChange={(open) => {
                        setLibraryDialogOpen(open);
                        if (!open) libraryForm.reset();
                     }}>
                        <DialogTrigger asChild>
                            <Button><Book className="ml-2 h-4 w-4" /> إضافة ملف جديد</Button>
                        </DialogTrigger>
                        <DialogContent>
                             <Form {...libraryForm}>
                                <form onSubmit={libraryForm.handleSubmit(onLibrarySubmit)} className="space-y-4">
                                    <DialogHeader>
                                        <DialogTitle>إضافة ملف جديد للمكتبة</DialogTitle>
                                        <DialogDescription>أدخل تفاصيل الملف وقم برفعه (PDF).</DialogDescription>
                                    </DialogHeader>
                                    <FormField control={libraryForm.control} name="title" render={({ field }) => (
                                        <FormItem><FormLabel>العنوان</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={libraryForm.control} name="description" render={({ field }) => (
                                        <FormItem><FormLabel>الوصف</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                     <FormField control={libraryForm.control} name="grade" render={({ field }) => (
                                         <FormItem>
                                            <FormLabel>الصف الدراسي</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="اختر الصف" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {GRADE_LEVELS.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={libraryForm.control} name="file" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>ملف (PDF)</FormLabel>
                                            <FormControl>
                                                <Input type="file" accept=".pdf" onChange={e => field.onChange(e.target.files)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <DialogFooter>
                                        <Button type="button" variant="secondary" onClick={() => setLibraryDialogOpen(false)}>إلغاء</Button>
                                        <Button type="submit" disabled={libraryForm.formState.isSubmitting}>
                                            {libraryForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'رفع وحفظ'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="explanations">إدارة الشروحات</TabsTrigger>
                    <TabsTrigger value="library">إدارة المكتبة</TabsTrigger>
                </TabsList>

                <TabsContent value="explanations">
                    <Card>
                        <CardHeader><CardTitle>قائمة الشروحات</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>العنوان</TableHead>
                                        <TableHead>الصف</TableHead>
                                        <TableHead>الرابط</TableHead>
                                        <TableHead>إجراء</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingExplanations ? renderSkeleton() : explanations.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center h-24">لا توجد شروحات حاليًا.</TableCell></TableRow>
                                    ) : (
                                        explanations.map(exp => (
                                            <TableRow key={exp.id}>
                                                <TableCell className="font-medium">{exp.title}</TableCell>
                                                <TableCell>{getGradeLabel(exp.grade)}</TableCell>
                                                <TableCell><a href={exp.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">مشاهدة</a></TableCell>
                                                <TableCell>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذا الشرح نهائيًا.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteExplanation(exp.id)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="library">
                    <Card>
                        <CardHeader><CardTitle>قائمة ملفات المكتبة</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>العنوان</TableHead>
                                        <TableHead>الصف</TableHead>
                                        <TableHead>الملف</TableHead>
                                        <TableHead>إجراء</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingLibrary ? renderSkeleton() : libraryFiles.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center h-24">لا توجد ملفات حاليًا.</TableCell></TableRow>
                                    ) : (
                                        libraryFiles.map(file => (
                                            <TableRow key={file.id}>
                                                <TableCell className="font-medium">{file.title}</TableCell>
                                                <TableCell>{getGradeLabel(file.grade)}</TableCell>
                                                <TableCell><a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">عرض/تحميل</a></TableCell>
                                                <TableCell>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذا الملف نهائيًا.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteLibraryFile(file)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </>
    );
}

export default withAdminAuth(AdminContentPage);
