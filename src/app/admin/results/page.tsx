
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Search, Download, CheckCircle, Dumbbell, ClipboardList, Edit } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import withAdminAuth from '@/components/withAdminAuth';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';


// --- Schemas & Types ---
const gradeSchema = z.object({
  grade: z.string().min(1, 'الدرجة مطلوبة.'),
});
type GradeFormValues = z.infer<typeof gradeSchema>;


// --- Interfaces ---
interface BaseResult {
  id: string;
  studentId: string;
  submittedAt: { seconds: number };
  examId: string;
  examTitle: string;
}
interface MCQResult extends BaseResult {
  type: 'mcq';
  score?: number;
  totalQuestions?: number;
}
interface FileResult extends BaseResult {
  type: 'file';
  grade?: string;
  fileUrl?: string;
}
interface PracticeResult extends BaseResult {
    practiceId: string;
    score?: number;
    totalQuestions?: number;
}

type ExamResult = MCQResult | FileResult;

type EnrichedExamResult = ExamResult & {
    studentName: string;
    studentEmail: string;
};

interface EnrichedPracticeResult extends PracticeResult {
    studentName: string;
    studentEmail: string;
    practiceTitle: string;
}

interface Exam {
    id: string;
    title: string;
}
interface Practice {
    id: string;
    title: string;
}


// --- Main Component ---
function AdminResultsPage() {
  const [examResults, setExamResults] = useState<EnrichedExamResult[]>([]);
  const [practiceResults, setPracticeResults] = useState<EnrichedPracticeResult[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedPractice, setSelectedPractice] = useState('all');

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all collections in parallel
      const [
        usersSnapshot, 
        examResultsSnapshot, 
        practiceResultsSnapshot,
        examsSnapshot,
        practicesSnapshot
      ] = await Promise.all([
        getDocs(query(collection(db, 'users'))),
        getDocs(query(collection(db, 'results'), orderBy('submittedAt', 'desc'))),
        getDocs(query(collection(db, 'practiceResults'), orderBy('submittedAt', 'desc'))),
        getDocs(query(collection(db, 'exams'))),
        getDocs(query(collection(db, 'practice')))
      ]);

      // Create maps for efficient lookups
      const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, { username: doc.data().username, email: doc.data().email }]));
      const examsMap = new Map(examsSnapshot.docs.map(doc => [doc.id, doc.data().title]));
      const practicesMap = new Map(practicesSnapshot.docs.map(doc => [doc.id, doc.data().title]));

      setExams(Array.from(examsMap, ([id, title]) => ({ id, title })));
      setPractices(Array.from(practicesMap, ([id, title]) => ({ id, title })));


      // Enrich results with names and titles
      const enrichedExamResults = examResultsSnapshot.docs.map(doc => {
          const result = { id: doc.id, ...doc.data() } as ExamResult;
          const studentInfo = usersMap.get(result.studentId);
          return {
            ...result,
            examTitle: examsMap.get(result.examId) || 'امتحان محذوف',
            studentName: studentInfo?.username || 'طالب محذوف',
            studentEmail: studentInfo?.email || 'غير معروف',
          }
      });
      setExamResults(enrichedExamResults as EnrichedExamResult[]);
      
      const enrichedPracticeResults = practiceResultsSnapshot.docs.map(doc => {
          const result = { id: doc.id, ...doc.data() } as PracticeResult;
          const studentInfo = usersMap.get(result.studentId);
          return {
            ...result,
            practiceTitle: practicesMap.get(result.practiceId) || 'تدريب محذوف',
            studentName: studentInfo?.username || 'طالب محذوف',
            studentEmail: studentInfo?.email || 'غير معروف',
          }
      });
      setPracticeResults(enrichedPracticeResults);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ title: 'خطأ', description: 'فشل في جلب البيانات.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleGradeSubmit = async (resultId: string, grade: string) => {
    try {
        const resultDocRef = doc(db, 'results', resultId);
        await updateDoc(resultDocRef, { grade });
        toast({ title: 'نجاح', description: 'تم رصد الدرجة بنجاح.' });
        fetchData(); // Refresh data
        return true;
    } catch (error) {
        console.error("Error submitting grade:", error);
        toast({ title: 'خطأ', description: 'فشل رصد الدرجة.', variant: 'destructive' });
        return false;
    }
  };

  const filteredExamResults = useMemo(() => {
    return examResults.filter(result => {
        const matchesSearchTerm = result.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || result.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesExamFilter = selectedExam === 'all' || result.examId === selectedExam;
        return matchesSearchTerm && matchesExamFilter;
    });
  }, [examResults, searchTerm, selectedExam]);

  const filteredPracticeResults = useMemo(() => {
    return practiceResults.filter(result => {
        const matchesSearchTerm = result.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || result.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPracticeFilter = selectedPractice === 'all' || result.practiceId === selectedPractice;
        return matchesSearchTerm && matchesPracticeFilter;
    });
  }, [practiceResults, searchTerm, selectedPractice]);

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">النتائج</h1>
      </div>
      <Tabs defaultValue="exams">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exams">
                <ClipboardList className="ml-2 h-4 w-4" />
                نتائج الامتحانات
            </TabsTrigger>
            <TabsTrigger value="practices">
                 <Dumbbell className="ml-2 h-4 w-4" />
                نتائج التدريبات
            </TabsTrigger>
        </TabsList>
        <TabsContent value="exams">
            <ResultsCard
                title="سجل نتائج الامتحانات"
                description="عرض وتصفية جميع نتائج الامتحانات التي أداها الطلاب."
                results={filteredExamResults}
                items={exams}
                loading={loading}
                type="exam"
                selectedItem={selectedExam}
                setSelectedItem={setSelectedExam}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onGradeSubmit={handleGradeSubmit}
            />
        </TabsContent>
        <TabsContent value="practices">
             <ResultsCard
                title="سجل نتائج التدريبات"
                description="عرض وتصفية جميع نتائج التدريبات التي أداها الطلاب."
                results={filteredPracticeResults}
                items={practices}
                loading={loading}
                type="practice"
                selectedItem={selectedPractice}
                setSelectedItem={setSelectedPractice}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
        </TabsContent>
      </Tabs>
    </>
  );
}

// --- Sub-components ---

function GradeFormDialog({ result, onGradeSubmit }: { result: FileResult, onGradeSubmit: (id: string, grade: string) => Promise<boolean> }) {
    const [open, setOpen] = useState(false);
    const form = useForm<GradeFormValues>({
        resolver: zodResolver(gradeSchema),
        defaultValues: { grade: result.grade || '' },
    });

    const handleSubmit = async (data: GradeFormValues) => {
        const success = await onGradeSubmit(result.id, data.grade);
        if (success) {
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Edit className="ml-2 h-4 w-4" />
                    {result.grade ? 'تعديل الدرجة' : 'إدخال الدرجة'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>رصد درجة الطالب</DialogTitle>
                    <DialogDescription>
                        أدخل درجة الطالب لهذا الامتحان (مثال: 50/60 أو ممتاز).
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="grade"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الدرجة</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="أدخل الدرجة هنا..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                حفظ الدرجة
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const ResultsCard = ({ title, description, results, items, loading, type, selectedItem, setSelectedItem, searchTerm, setSearchTerm, onGradeSubmit }: any) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="بحث باسم الطالب أو بريده الإلكتروني..." 
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full sm:w-auto sm:min-w-[200px]">
                        <Select value={selectedItem} onValueChange={setSelectedItem}>
                            <SelectTrigger>
                                <SelectValue placeholder={`تصفية حسب ${type === 'exam' ? 'الامتحان' : 'التدريب'}`} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل {type === 'exam' ? 'الامتحانات' : 'التدريبات'}</SelectItem>
                                {items.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>الطالب</TableHead>
                        <TableHead className="hidden sm:table-cell">{type === 'exam' ? 'الامتحان' : 'التدريب'}</TableHead>
                        <TableHead className="text-center">النتيجة/الإجابة</TableHead>
                        <TableHead className="hidden md:table-cell">التاريخ</TableHead>
                        <TableHead className="text-center">إجراء</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                    )) : results.length > 0 ? (
                        results.map((result: any) => (
                        <TableRow key={result.id}>
                            <TableCell>
                            <div className="font-medium">{result.studentName}</div>
                            <div className="text-xs text-muted-foreground hidden sm:block">{result.studentEmail}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{result.examTitle || result.practiceTitle}</TableCell>
                            <TableCell className="text-center font-bold">
                                {result.type === 'mcq' || type === 'practice' ? (
                                    `${result.score || 0} / ${result.totalQuestions || 0} (${Math.round(((result.score || 0) / (result.totalQuestions || 1)) * 100)}%)`
                                ) : result.grade ? (
                                    <div className="flex items-center justify-center gap-2 text-green-400">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>{result.grade}</span>
                                    </div>
                                ) : (
                                    <Button asChild size="sm" variant="outline" className="bg-destructive/10 text-destructive-foreground">
                                        <a href={result.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="ml-2 h-4 w-4" /> تحميل
                                        </a>
                                    </Button>
                                )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{format(new Date(result.submittedAt.seconds * 1000), 'dd/MM/yyyy hh:mm a')}</TableCell>
                            <TableCell className="text-center">
                            {(result.type === 'mcq' && type === 'exam') && (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/admin/results/${result.id}`}>
                                        <Eye className="ml-2 h-4 w-4" />
                                        عرض
                                    </Link>
                                </Button>
                            )}
                            {(result.type === 'file' && type === 'exam') && (
                               <GradeFormDialog result={result} onGradeSubmit={onGradeSubmit} />
                            )}
                            {type === 'practice' && (
                                 <Badge variant="secondary">لا يوجد إجراء</Badge>
                            )}
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">{loading ? 'جاري التحميل...' : 'لا توجد نتائج مطابقة للبحث.'}</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default withAdminAuth(AdminResultsPage);
