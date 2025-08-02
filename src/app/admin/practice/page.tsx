
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Loader2, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import withAdminAuth from '@/components/withAdminAuth';
import { Badge } from '@/components/ui/badge';


const practiceSchema = z.object({
  title: z.string().min(3, 'عنوان التدريب يجب أن يكون 3 أحرف على الأقل.'),
  description: z.string().min(10, 'الوصف يجب أن يكون 10 أحرف على الأقل.'),
  grade: z.string({ required_error: 'الرجاء اختيار الصف الدراسي.' }),
  type: z.literal('mcq').default('mcq'),
});

type PracticeFormValues = z.infer<typeof practiceSchema>;

interface Practice {
  id: string;
  title: string;
  description: string;
  grade: string;
  type: 'mcq' | 'file';
  questionsCount?: number;
}


function AdminPracticePage() {
  const [practiceItems, setPracticeItems] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreatePracticeDialogOpen, setCreatePracticeDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const practiceForm = useForm<PracticeFormValues>({ 
    resolver: zodResolver(practiceSchema), 
    defaultValues: {
      type: 'mcq',
      title: '',
      description: '',
    } 
  });

  const fetchPracticeItems = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'practice'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const itemsList = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          let questionsCount = 0;
          if (data.type === 'mcq') {
             const questionsSnapshot = await getCountFromServer(collection(db, `practice/${doc.id}/questions`));
             questionsCount = questionsSnapshot.data().count;
          }
          return { id: doc.id, ...data, questionsCount } as Practice;
        })
      );
      setPracticeItems(itemsList);
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في جلب التدريبات.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPracticeItems();
  }, [fetchPracticeItems]);

  const onCreatePracticeSubmit: SubmitHandler<PracticeFormValues> = async (data) => {
    try {
      await addDoc(collection(db, 'practice'), { ...data, type:'mcq', createdAt: serverTimestamp() });
      toast({ title: 'نجاح', description: 'تم إنشاء التدريب بنجاح.' });
      setCreatePracticeDialogOpen(false);
      practiceForm.reset();
      fetchPracticeItems();
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل إنشاء التدريب.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // In a real app, you might want to delete subcollection documents first
      await deleteDoc(doc(db, 'practice', id));
      toast({ title: 'نجاح', description: `تم الحذف بنجاح.` });
      fetchPracticeItems();
    } catch (error) {
       toast({ title: 'خطأ', description: 'فشل الحذف.', variant: 'destructive' });
    }
  };
  
  const getGradeLabel = (value: string) => GRADE_LEVELS.find(level => level.value === value)?.label || value;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">إدارة التدريبات</h1>
        <Dialog open={isCreatePracticeDialogOpen} onOpenChange={(open) => {
          setCreatePracticeDialogOpen(open);
          if(!open) practiceForm.reset();
        }}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto"><PlusCircle className="ml-2 h-4 w-4" /> إنشاء تدريب</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader><DialogTitle>إنشاء تدريب جديد</DialogTitle><DialogDescription>التدريبات هي للمراجعة الذاتية للطالب.</DialogDescription></DialogHeader>
                <Form {...practiceForm}>
                    <form onSubmit={practiceForm.handleSubmit(onCreatePracticeSubmit)} className="space-y-4 py-4">
                        <FormField control={practiceForm.control} name="title" render={({ field }) => ( <FormItem><FormLabel>عنوان التدريب</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={practiceForm.control} name="description" render={({ field }) => ( <FormItem><FormLabel>وصف قصير</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={practiceForm.control} name="grade" render={({ field }) => ( <FormItem><FormLabel>الصف الدراسي</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر الصف" /></SelectTrigger></FormControl><SelectContent>{GRADE_LEVELS.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                        <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setCreatePracticeDialogOpen(false)}>إلغاء</Button>
                        <Button type="submit" disabled={practiceForm.formState.isSubmitting}>{practiceForm.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'إنشاء التدريب'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>قائمة التدريبات</CardTitle>
            <CardDescription>عرض وتعديل وحذف التدريبات المتاحة للطلاب.</CardDescription>
        </CardHeader>
        <CardContent>
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>عنوان التدريب</TableHead>
                <TableHead>الصف الدراسي</TableHead>
                <TableHead className="text-center">عدد الأسئلة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>) : practiceItems.length > 0 ? (
                practiceItems.map((item: Practice) => (
                <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{getGradeLabel(item.grade)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        <FileText className="h-3 w-3 ml-1" />
                        {item.type === 'mcq' ? item.questionsCount : 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                        <AlertDialog>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {item.type === 'mcq' && (
                                <DropdownMenuItem asChild>
                                    <Link href={`/admin/practice/${item.id}`}><Pencil className="ml-2 h-4 w-4" /> تعديل الأسئلة</Link>
                                </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle><AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف التدريب وكل أسئلته بشكل دائم.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive hover:bg-destructive/90">نعم، قم بالحذف</AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">لم يتم إنشاء أي تدريبات بعد.</TableCell></TableRow>
            )}
            </TableBody>
        </Table>
        </CardContent>
      </Card>
    </>
  );
}

export default withAdminAuth(AdminPracticePage);

    