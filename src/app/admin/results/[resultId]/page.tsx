'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Check, X, User, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import withAdminAuth from '@/components/withAdminAuth';

interface ResultDetails {
  studentId: string;
  examId: string;
  score: number;
  totalQuestions: number;
  answers: { [key: string]: string };
  submittedAt: { seconds: number };
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

interface StudentDetails {
    username: string;
}

interface ExamDetails {
    title: string;
}

function AdminResultDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.resultId as string;
  const { toast } = useToast();

  const [result, setResult] = useState<ResultDetails | null>(null);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!resultId) return;
    setLoading(true);
    try {
      // Fetch result
      const resultDocRef = doc(db, 'results', resultId);
      const resultDocSnap = await getDoc(resultDocRef);
      if (!resultDocSnap.exists()) {
        toast({ title: 'خطأ', description: 'النتيجة غير موجودة.', variant: 'destructive' });
        router.push('/admin/results');
        return;
      }
      const resultData = resultDocSnap.data() as ResultDetails;
      setResult(resultData);

      // Fetch student, exam, and questions in parallel
      const [studentSnap, examSnap, questionsSnap] = await Promise.all([
        getDoc(doc(db, 'users', resultData.studentId)),
        getDoc(doc(db, 'exams', resultData.examId)),
        getDocs(query(collection(db, `exams/${resultData.examId}/questions`), orderBy('createdAt')))
      ]);
      
      if(studentSnap.exists()) setStudent(studentSnap.data() as StudentDetails);
      if(examSnap.exists()) setExam(examSnap.data() as ExamDetails);
      
      const questionsList = questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      setQuestions(questionsList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: 'خطأ', description: 'فشل في جلب بيانات النتيجة.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [resultId, router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (!result || !student || !exam) {
    return <div>لم يتم العثور على البيانات.</div>;
  }
  
  const percentage = Math.round((result.score / result.totalQuestions) * 100);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" onClick={() => router.push('/admin/results')} className="mb-2">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للنتائج
          </Button>
          <h1 className="text-lg font-semibold md:text-2xl font-headline">
            تفاصيل نتيجة الطالب: <span className="text-primary">{student.username}</span>
          </h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-3">
             <CardHeader>
                <CardTitle className="font-headline text-primary">{exam.title}</CardTitle>
                <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{student.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>الدرجة: {result.score} / {result.totalQuestions} ({percentage}%)</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {questions.map((q, index) => {
                        const studentAnswer = result.answers[q.id];
                        const isCorrect = studentAnswer === q.correctAnswer;
                        return (
                             <Card key={q.id} className={`p-4 ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                <p className="font-semibold">{index + 1}. {q.text}</p>
                                <div className="mt-4 space-y-2 text-sm">
                                    <div><strong>الإجابة الصحيحة:</strong> <Badge variant="outline">{q.correctAnswer}</Badge></div>
                                    <div className="flex items-center gap-2">
                                        <strong>إجابة الطالب:</strong> 
                                        <Badge variant={isCorrect ? "default" : "destructive"}>{studentAnswer || 'لم تتم الإجابة'}</Badge>
                                        {isCorrect ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-destructive" />}
                                    </div>
                                </div>
                             </Card>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}

export default withAdminAuth(AdminResultDetailsPage);
