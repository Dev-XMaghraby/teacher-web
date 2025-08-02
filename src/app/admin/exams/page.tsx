
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
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
import { PlusCircle, MoreHorizontal, Trash2, Pencil, PenLine, FileUp, FileText, Loader2, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import withAdminAuth from '@/components/withAdminAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { nanoid } from 'nanoid';


const examSchema = z.object({
  type: z.literal('mcq'),
  title: z.string().min(3, 'عنوان الامتحان يجب أن يكون 3 أحرف على الأقل.'),
  description: z.string().min(10, 'الوصف يجب أن يكون 10 أحرف على الأقل.'),
  grade: z.string({ required_error: 'الرجاء اختيار الصف الدراسي.' }),
  questions: z.coerce.number().int().positive('عدد الأسئلة يجب أن يكون رقمًا صحيحًا موجبًا.'),
  duration: z.coerce.number().int().positive('المدة يجب أن تكون رقمًا صحيحًا موجبًا.'),
});

const fileExamSchema = z.object({
  type: z.literal('file'),
  title: z.string().min(3, 'عنوان الامتحان يجب أن يكون 3 أحرف على الأقل.'),
  description: z.string().min(10, 'الوصف يجب أن يكون 10 أحرف على الأقل.'),
  grade: z.string({ required_error: 'الرجاء اختيار الصف الدراسي.' }),
  file: z.any().refine(files => files?.length === 1, 'ملف الأسئلة مطلوب.'),
});

const formSchema = z.discriminatedUnion("type", [examSchema, fileExamSchema]);


type ExamFormValues = z.infer<typeof formSchema>;


interface Exam {
  id: string;
  title: string;
  description: string;
  grade: string;
  type: 'mcq' | 'file';
  questions?: number;
  duration?: number;
  fileUrl?: string;
  filePath?: string;
  createdAt?: any;
  resultsPublished?: boolean;
  questionsCount?: number;
}


function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateExamDialogOpen, setCreateExamDialogOpen] = useState(false);
  const [isEditExamDialogOpen, setEditExamDialogOpen] = useState(false);

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const { toast } = useToast();

  const mcqForm = useForm<z.infer<typeof examSchema>>({ 
    resolver: zodResolver(examSchema),
    defaultValues: {
      type: 'mcq',
      title: '',
      description: '',
      grade: undefined,
      questions: 10,
      duration: 20,
    }
  });
  
  const fileForm = useForm<z.infer<typeof fileExamSchema>>({
    resolver: zodResolver(fileExamSchema),
    defaultValues: {
      type: 'file',
      title: '',
      description: '',
      grade: undefined,
      file: undefined,
    }
  });


  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
        const q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const examsList = await Promise.all(
            querySnapshot.docs.map(async (doc) => {
                const data = doc.data() as Omit<Exam, 'id' | 'questionsCount'>;
                let questionsCount = 0;
                if (data.type === 'mcq') {
                    const questionsSnapshot = await getCountFromServer(collection(db, `exams/${doc.id}/questions`));
                    questionsCount = questionsSnapshot.data().count;
                }
                return { id: doc.id, ...data, questionsCount } as Exam;
            })
        );
        setExams(examsList);
    } catch (error) {
        toast({ title: 'خطأ', description: 'فشل في جلب الامتحانات.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
}, [toast]);


  useEffect(() => {
    fetchExams();
  }, [fetchExams]);
  
   const handleDialogClose = useCallback(() => {
      mcqForm.reset();
      fileForm.reset();
      setSelectedExam(null);
  }, [mcqForm, fileForm]);

  useEffect(() => {
    if (!isEditExamDialogOpen) {
      handleDialogClose();
    }
  }, [isEditExamDialogOpen, handleDialogClose]);

  // Effect to populate form when edit dialog opens
  useEffect(() => {
    if (isEditExamDialogOpen && selectedExam) {
        if(selectedExam.type === 'mcq') {
            mcqForm.reset({
                type: 'mcq',
                title: selectedExam.title,
                description: selectedExam.description,
                grade: selectedExam.grade,
                questions: selectedExam.questions || 10,
                duration: selectedExam.duration || 20,
            });
        }
    }
  }, [isEditExamDialogOpen, selectedExam, mcqForm]);
  
   

  const onCreateMCQExamSubmit: SubmitHandler<z.infer<typeof examSchema>> = async (data) => {
    try {
      await addDoc(collection(db, 'exams'), { ...data, createdAt: serverTimestamp(), resultsPublished: false });
      toast({ title: 'نجاح', description: 'تم إنشاء الامتحان بنجاح.' });
      setCreateExamDialogOpen(false);
      fetchExams();
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل إنشاء الامتحان.', variant: 'destructive' });
    }
  };
  
  const onFileExamSubmit: SubmitHandler<z.infer<typeof fileExamSchema>> = async (data) => {
    const file = data.file[0];
    if (!file) return;

    const uniqueFileName = `${nanoid()}-${file.name}`;
    const filePath = `exam_questions/${uniqueFileName}`;
    const storageRef = ref(storage, filePath);
    
    try {
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);

        await addDoc(collection(db, 'exams'), {
            title: data.title, description: data.description, grade: data.grade,
            type: 'file', fileUrl, filePath, createdAt: serverTimestamp(),
        });
        toast({ title: 'نجاح', description: 'تم إنشاء امتحان الملف بنجاح.' });
        setCreateExamDialogOpen(false);
        fetchExams();
    } catch (error) {
      console.error(error);
      toast({ title: 'خطأ', description: 'فشل إنشاء امتحان الملف.', variant: 'destructive' });
    }
  };

  const onEditExamSubmit: SubmitHandler<z.infer<typeof examSchema>> = async (data) => {
    if (!selectedExam) return;
    try {
        const examDocRef = doc(db, 'exams', selectedExam.id);
        await updateDoc(examDocRef, data as any);
        toast({ title: 'نجاح', description: 'تم تحديث الامتحان بنجاح.' });
        setEditExamDialogOpen(false);
        fetchExams();
    } catch (error) {
        toast({ title: 'خطأ', description: 'فشل تحديث الامتحان.', variant: 'destructive' });
    }
  };
  
 const handleDelete = async (exam: Exam) => {
    try {
      // If it's a file exam, delete the associated file from storage first
      if (exam.type === 'file' && exam.filePath) {
        const fileRef = ref(storage, exam.filePath);
        await deleteObject(fileRef);
      }
      
      await deleteDoc(doc(db, 'exams', exam.id));
      toast({ title: 'نجاح', description: `تم الحذف بنجاح.` });
      fetchExams();
    } catch (error) {
       toast({ title: 'خطأ', description: 'فشل الحذف.', variant: 'destructive' });
    }
  };

  const handlePublishResults = async (examId: string) => {
    try {
      const examDocRef = doc(db, 'exams', examId);
      await updateDoc(examDocRef, { resultsPublished: true });
      toast({ title: 'نجاح', description: 'تم نشر نتائج الامتحان للطلاب.' });
      fetchExams();
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل نشر النتائج.', variant: 'destructive' });
    }
  };
  
  const openEditDialog = (exam: Exam) => {
    setSelectedExam(exam);
    setEditExamDialogOpen(true);
  };
  
  const getGradeLabel = (value: string) => GRADE_LEVELS.find(level => level.value === value)?.label || value;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">إدارة الامتحانات ({loading ? '...' : exams.length})</h1>
        <div className='flex gap-2'>
           <Dialog open={isCreateExamDialogOpen} onOpenChange={(open) => { 
                setCreateExamDialogOpen(open);
                if (!open) {
                    mcqForm.reset();
                    fileForm.reset();
                }
            }}>
            <DialogTrigger asChild>
               <Button className="w-full sm:w-auto"><PlusCircle className="ml-2 h-4 w-4" /> إنشاء امتحان</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader><DialogTitle>إنشاء امتحان جديد</DialogTitle><DialogDescription>اختر نوع الامتحان الذي تريد إنشاءه.</DialogDescription></DialogHeader>
              <Tabs defaultValue="mcq" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="mcq"><FileText className="ml-2 h-4 w-4" />امتحان أسئلة (MCQ)</TabsTrigger>
                      <TabsTrigger value="file"><FileUp className="ml-2 h-4 w-4" />امتحان بملف (PDF)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="mcq">
                      <ExamForm form={mcqForm} onSubmit={onCreateMCQExamSubmit} onCancel={() => setCreateExamDialogOpen(false)} />
                  </TabsContent>
                  <TabsContent value="file">
                      <FileExamForm form={fileForm} onSubmit={onFileExamSubmit} onCancel={() => setCreateExamDialogOpen(false)} />
                  </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <ExamsTable exams={exams} loading={loading} onEdit={openEditDialog} onDelete={handleDelete} getGradeLabel={getGradeLabel} onPublishResults={onPublishResults} />
      
       <Dialog open={isEditExamDialogOpen} onOpenChange={setEditExamDialogOpen}>
          <DialogContent className="sm:max-w-[625px]">
            {selectedExam && selectedExam.type === 'mcq' && (
                <ExamForm form={mcqForm} onSubmit={onEditExamSubmit} onCancel={() => setEditExamDialogOpen(false)} isEditing />
            )}
          </DialogContent>
        </Dialog>
    </>
  );
}

// Sub-components for forms and tables to keep the main component clean

const ExamForm = ({ form, onSubmit, onCancel, isEditing = false }: any) => (
   <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
      <DialogHeader><DialogTitle>{isEditing ? 'تعديل بيانات الامتحان' : 'إنشاء امتحان أسئلة'}</DialogTitle></DialogHeader>
      <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>عنوان الامتحان</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>وصف قصير</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={form.control} name="grade" render={({ field }) => (<FormItem><FormLabel>الصف الدراسي</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر الصف" /></SelectTrigger></FormControl><SelectContent>{GRADE_LEVELS.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={form.control} name="questions" render={({ field }) => (<FormItem><FormLabel>عدد الأسئلة</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="duration" render={({ field }) => (<FormItem><FormLabel>المدة (بالدقائق)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
      </div>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : isEditing ? 'حفظ التعديلات' : 'إنشاء الامتحان'}
        </Button>
      </DialogFooter>
    </form>
  </Form>
);

const FileExamForm = ({ form, onSubmit, onCancel }: any) => {
    return (
     <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>عنوان الامتحان</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>وصف قصير</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )}/>
        <FormField control={form.control} name="grade" render={({ field }) => ( <FormItem><FormLabel>الصف الدراسي</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر الصف" /></SelectTrigger></FormControl><SelectContent>{GRADE_LEVELS.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
        <FormField control={form.control} name="file" render={({ field }) => ( <FormItem><FormLabel>ملف الأسئلة (PDF)</FormLabel><FormControl><Input type="file" accept=".pdf" onChange={e => field.onChange(e.target.files)} /></FormControl><FormMessage /></FormItem>)}/>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'إنشاء الامتحان'}</Button>
        </DialogFooter>
      </form>
    </Form>
    );
};


const ExamsTable = ({ exams, loading, onEdit, onDelete, getGradeLabel, onPublishResults }: any) => (
  <Card>
    <CardHeader>
      <CardTitle>قائمة الامتحانات</CardTitle>
      <CardDescription>عرض وتعديل وحذف الامتحانات المتاحة للطلاب.</CardDescription>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>عنوان الامتحان</TableHead>
            <TableHead className="hidden sm:table-cell">الصف الدراسي</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead className="hidden md:table-cell text-center">النتائج</TableHead>
            <TableHead className="text-center">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) : exams.length > 0 ? (
            exams.map((exam: Exam) => (
              <TableRow key={exam.id}>
                <TableCell className="font-medium">{exam.title}</TableCell>
                <TableCell className="hidden sm:table-cell">{getGradeLabel(exam.grade)}</TableCell>
                <TableCell>
                  <Badge variant={exam.type === 'mcq' ? 'default' : 'secondary'}>
                    <div className="flex items-center gap-1">
                      {exam.type === 'mcq' ? <FileText className="h-3 w-3" /> : <FileUp className="h-3 w-3" />}
                      <span>{exam.type === 'mcq' ? `أسئلة (${exam.questionsCount || 0})` : 'ملف'}</span>
                    </div>
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-center">
                    {exam.type === 'mcq' && (
                        <Badge variant={exam.resultsPublished ? 'default' : 'secondary'} className={exam.resultsPublished ? 'bg-green-500' : ''}>
                          {exam.resultsPublished ? 'منشورة' : 'غير منشورة'}
                        </Badge>
                    )}
                </TableCell>
                <TableCell className="text-center">
                  <ActionsMenu item={exam} onEdit={onEdit} onDelete={onDelete} type="exam" onPublishResults={onPublishResults} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={5} className="text-center h-24">لم يتم إنشاء أي امتحانات بعد.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

const ActionsMenu = ({ item, onEdit, onDelete, type, onPublishResults }: { item: any, onEdit?: (item: any) => void, onDelete: (item: any) => void, type: 'exam' | 'practice', onPublishResults: (id: string) => void }) => (
  <AlertDialog>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item.type === 'mcq' && !item.resultsPublished && (
            <DropdownMenuItem onClick={() => onPublishResults(item.id)}>
                <Send className="ml-2 h-4 w-4" /> نشر النتائج
            </DropdownMenuItem>
        )}
        {item.type === 'mcq' && (
          <DropdownMenuItem asChild>
             <Link href={`/admin/${type}s/${item.id}`}><Pencil className="ml-2 h-4 w-4" /> تعديل الأسئلة</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onEdit && onEdit(item)} disabled={item.type === 'file'}>
          <PenLine className="ml-2 h-4 w-4" /> تعديل بيانات الامتحان
        </DropdownMenuItem>
        {item.fileUrl && (
          <DropdownMenuItem asChild><a href={item.fileUrl} target="_blank" rel="noopener noreferrer"><FileText className="ml-2 h-4 w-4" /> عرض ملف الأسئلة</a></DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <AlertDialogTrigger asChild>
          <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
        </AlertDialogTrigger>
      </DropdownMenuContent>
    </DropdownMenu>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف العنصر وكل بياناته المرتبطة بشكل دائم.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>إلغاء</AlertDialogCancel>
        <AlertDialogAction onClick={() => onDelete(item)} className="bg-destructive hover:bg-destructive/90">نعم، قم بالحذف</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);


export default withAdminAuth(AdminExamsPage);

    

    