
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, ArrowRight, Loader2, CheckCircle, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import withAdminAuth from '@/components/withAdminAuth';
import { Label } from '@/components/ui/label';

// Define the schema and type outside the component
const questionSchema = z.object({
    text: z.string().min(5, 'نص السؤال يجب أن يكون 5 أحرف على الأقل.'),
    options: z.array(
        z.object({ value: z.string().min(1, 'الخيار لا يمكن أن يكون فارغًا.') })
    ).length(4, 'يجب أن يكون هناك 4 خيارات.'),
    correctAnswer: z.string({ required_error: 'الرجاء تحديد الإجابة الصحيحة.' }),
    explanation: z.string().optional(),
});
type QuestionFormValues = z.infer<typeof questionSchema>;

interface PracticeDetails {
  title: string;
}

interface Question extends Omit<QuestionFormValues, 'options'>{
  id: string;
  options: string[];
  explanation?: string;
}


function ManagePracticeQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const practiceId = params.practiceId as string;
  const { toast } = useToast();

  const [practiceDetails, setPracticeDetails] = useState<PracticeDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      text: '',
      options: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }],
      correctAnswer: undefined,
      explanation: '',
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  const fetchPracticeData = useCallback(async () => {
    if (!practiceId) return;
    try {
      setLoading(true);
      const practiceDocRef = doc(db, 'practice', practiceId);
      const practiceDocSnap = await getDoc(practiceDocRef);

      if (practiceDocSnap.exists()) {
        const practiceData = practiceDocSnap.data();
        if (practiceData.type !== 'mcq') {
            toast({ title: 'خطأ', description: 'هذه الصفحة مخصصة للتدريبات من نوع أسئلة فقط.', variant: 'destructive' });
            router.push('/admin/practice');
            return;
        }
        setPracticeDetails(practiceData as PracticeDetails);
      } else {
        toast({ title: 'خطأ', description: 'التدريب غير موجود.', variant: 'destructive' });
        router.push('/admin/practice');
        return;
      }

      const questionsQuery = query(collection(db, `practice/${practiceId}/questions`), orderBy('createdAt'));
      const questionsSnapshot = await getDocs(questionsQuery);
      const questionsList = questionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as Question;
      });
      setQuestions(questionsList);
    } catch (error) {
      console.error("Error fetching practice data:", error);
      toast({ title: 'خطأ', description: 'فشل في جلب بيانات التدريب.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [practiceId, router, toast]);

  useEffect(() => {
    fetchPracticeData();
  }, [fetchPracticeData]);

   useEffect(() => {
    if (editingQuestion) {
        form.reset({
            text: editingQuestion.text,
            options: editingQuestion.options.map(opt => ({ value: opt })),
            correctAnswer: editingQuestion.correctAnswer,
            explanation: editingQuestion.explanation,
        });
    } else {
        form.reset({
            text: '',
            options: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }],
            correctAnswer: undefined,
            explanation: '',
        });
    }
  }, [editingQuestion, form]);
  
  const onQuestionSubmit: SubmitHandler<QuestionFormValues> = async (data) => {
    try {
        const submissionData = {
            ...data,
            options: data.options.map(opt => opt.value),
        };
        
        if (editingQuestion) {
            const questionDocRef = doc(db, `practice/${practiceId}/questions`, editingQuestion.id);
            await updateDoc(questionDocRef, submissionData);
            toast({ title: 'نجاح', description: 'تم تعديل السؤال بنجاح.' });
        } else {
            await addDoc(collection(db, `practice/${practiceId}/questions`), { ...submissionData, createdAt: Timestamp.now() });
            toast({ title: 'نجاح', description: 'تمت إضافة السؤال بنجاح.' });
        }
        
        setDialogOpen(false);
        setEditingQuestion(null);
        fetchPracticeData();
    } catch (error) {
        console.error("Error submitting question:", error);
        toast({ title: 'خطأ', description: 'فشل في حفظ السؤال.', variant: 'destructive' });
    }
  };
  
  const handleDeleteQuestion = async (questionId: string) => {
    try {
        await deleteDoc(doc(db, `practice/${practiceId}/questions`, questionId));
        toast({ title: 'نجاح', description: 'تم حذف السؤال بنجاح.' });
        fetchPracticeData();
    } catch (error) {
        toast({ title: 'خطأ', description: 'فشل في حذف السؤال.', variant: 'destructive' });
    }
  };

  if (loading || !practiceDetails) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-10 w-[150px]" />
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
        <div>
            <Button variant="ghost" onClick={() => router.push('/admin/practice')} className="mb-2">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة للتدريبات
            </Button>
            <h1 className="text-lg font-semibold md:text-2xl font-headline">
                إدارة أسئلة تدريب: <span className="text-primary">{practiceDetails.title}</span>
            </h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) setEditingQuestion(null);
            setDialogOpen(isOpen);
        }}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="ml-2 h-4 w-4" /> إضافة سؤال جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editingQuestion ? 'تعديل السؤال' : 'إضافة سؤال جديد للتدريب'}</DialogTitle>
                    <DialogDescription>
                        أدخل نص السؤال، الخيارات، حدد الإجابة الصحيحة، ويمكنك إضافة شرح للإجابة.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onQuestionSubmit)} className="space-y-6 py-4">
                        <FormField control={form.control} name="text" render={({ field }) => (
                            <FormItem><FormLabel>نص السؤال</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                            <FormItem className="space-y-3"><FormLabel>الخيارات (حدد الإجابة الصحيحة)</FormLabel>
                                 <FormControl>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {fields.map((item, index) => (
                                           <FormField key={item.id} control={form.control} name={`options.${index}.value`} render={({ field: optionField }) => (
                                                <FormItem><FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value={optionField.value} id={`option-${index}`} disabled={!optionField.value} />
                                                        <Label htmlFor={`option-${index}`} className="w-full">
                                                            <Input {...optionField} placeholder={`الخيار ${index + 1}`} />
                                                        </Label>
                                                    </div>
                                                </FormControl><FormMessage/></FormItem>
                                           )}/>
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage className="pt-2">{form.formState.errors.correctAnswer?.message}</FormMessage>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="explanation" render={({ field }) => (
                            <FormItem><FormLabel>شرح الإجابة (اختياري)</FormLabel><FormControl><Textarea {...field} placeholder="اشرح لماذا هذه هي الإجابة الصحيحة..." /></FormControl><FormMessage /></FormItem>
                        )} />

                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle className="ml-2 h-4 w-4" />}
                                {editingQuestion ? 'حفظ التعديلات' : 'إضافة السؤال'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>قائمة الأسئلة ({questions.length})</CardTitle>
          <CardDescription>عرض وحذف وتعديل أسئلة هذا التدريب.</CardDescription>
        </CardHeader>
        <CardContent>
            {questions.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                    لم يتم إضافة أي أسئلة لهذا التدريب بعد.
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.map((q, index) => (
                        <Card key={q.id} className="p-4 bg-muted/30">
                           <div className="flex items-start justify-between">
                             <div className="flex-grow">
                                <p className="font-semibold">{index + 1}. {q.text}</p>
                                <ul className="mt-2 list-inside space-y-1 text-sm grid grid-cols-2 gap-x-4">
                                    {q.options.map((opt, i) => {
                                        const isCorrect = opt === q.correctAnswer;
                                        return (
                                            <li key={i} className={`flex items-center gap-2 ${isCorrect ? 'font-bold text-green-400' : ''}`}>
                                               {isCorrect && <CheckCircle className="h-4 w-4" />}
                                               <span>{opt}</span>
                                            </li>
                                        )
                                    })}
                                </ul>
                                {q.explanation && (
                                    <div className="mt-3 text-xs text-muted-foreground bg-background/50 p-2 rounded-md">
                                        <p><span className="font-bold">الشرح:</span> {q.explanation}</p>
                                    </div>
                                )}
                             </div>
                              <div className="flex items-center shrink-0">
                                 <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => { setEditingQuestion(q); setDialogOpen(true); }}>
                                     <Pencil className="h-4 w-4" />
                                 </Button>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف هذا السؤال بشكل نهائي.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteQuestion(q.id)} className="bg-destructive hover:bg-destructive/90">
                                                نعم، قم بالحذف
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             </div>
                           </div>
                        </Card>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}

export default withAdminAuth(ManagePracticeQuestionsPage);
