'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Check, CheckCircle, Home, List, X, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ExamDetails {
  title: string;
  resultsPublished?: boolean;
  type: 'mcq' | 'file';
}

interface ResultDetails {
  score: number;
  totalQuestions: number;
  examId: string;
  answers: { [key: string]: string };
  type: 'mcq' | 'file';
  grade?: string; // For file exams
  fileUrl?: string; // For file exams
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}


function ResultsPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const resultId = searchParams.get('resultId');

  const [resultDetails, setResultDetails] = useState<ResultDetails | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResultData = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!resultId) {
      setError("رقم النتيجة غير موجود.");
      setLoading(false);
      return;
    }
    
    try {
      const resultDocRef = doc(db, 'results', resultId);
      const resultDocSnap = await getDoc(resultDocRef);

      if (!resultDocSnap.exists()) {
        setError("لم يتم العثور على النتيجة.");
        setLoading(false);
        return;
      }
      const resultData = resultDocSnap.data() as ResultDetails;
      setResultDetails(resultData);
      
      const examDocRef = doc(db, 'exams', resultData.examId);
      const examDocSnap = await getDoc(examDocRef);

      if (!examDocSnap.exists()) {
        setError("لم يتم العثور على تفاصيل الامتحان.");
        setLoading(false);
        return;
      }
      const examData = examDocSnap.data() as ExamDetails;
      setExamDetails(examData);
      
      if (examData.type === 'file') {
          // This case is handled by useEffect redirect, but as a safeguard.
          setError("هذه الصفحة مخصصة لنتائج امتحانات الأسئلة فقط.");
          setLoading(false);
          return;
      }

       if (!examData.resultsPublished) {
          setError("لم يتم نشر نتائج هذا الامتحان بعد. يرجى المحاولة لاحقاً.");
          setLoading(false);
          return;
        }

      const questionsQuery = query(collection(db, `exams/${resultData.examId}/questions`), orderBy('createdAt'));
      const questionsSnapshot = await getDocs(questionsQuery);
      
      const questionsList = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as Question));
      setQuestions(questionsList);

    } catch (err) {
      console.error("Error fetching result data:", err);
      setError("حدث خطأ أثناء تحميل النتيجة.");
    } finally {
      setLoading(false);
    }
  }, [resultId]);
  
  useEffect(() => {
    fetchResultData();
  }, [fetchResultData]);

  useEffect(() => {
    if (!loading && resultDetails?.type === 'file') {
      router.push('/exams');
    }
  }, [loading, resultDetails, router]);

  
  if (loading) {
    return (
     <Card className="w-full max-w-2xl text-center p-8">
        <CardHeader>
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-5 w-1/2 mx-auto mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-1/4 mx-auto" />
            <Skeleton className="h-6 w-1/4 mx-auto" />
        </CardContent>
        <CardFooter>
            <Skeleton className="h-10 w-full" />
        </CardFooter>
    </Card>
    );
  }

  if (error) {
    return (
       <Card className="w-full max-w-lg text-center p-8">
        <CardHeader>
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <CardTitle>خطأ في عرض النتيجة</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/dashboard">العودة للوحة التحكم</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (!resultDetails || !examDetails) {
    return null; // or a fallback component
  }

  const percentage = resultDetails.totalQuestions > 0 ? Math.round((resultDetails.score / resultDetails.totalQuestions) * 100) : 0;
  const isPassed = percentage >= 50;

  return (
     <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
        <Card className="w-full max-w-3xl text-center p-6 sm:p-8 animate-fade-in-up">
            <CardHeader>
                <div className={`mx-auto bg-gradient-to-br ${isPassed ? 'from-green-400 to-emerald-600' : 'from-red-400 to-rose-600'} rounded-full p-4 w-fit mb-4 shadow-lg`}>
                    <Award className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                </div>
                <CardTitle className="font-headline text-2xl sm:text-3xl text-primary">{examDetails.title}</CardTitle>
                <CardDescription className="text-lg sm:text-xl text-muted-foreground">
                    نتيجتك النهائية ومراجعة إجاباتك
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-5xl sm:text-6xl font-bold text-foreground">
                    {percentage}%
                </div>
                 <div className="text-base sm:text-lg text-muted-foreground">
                    لقد أجبت بشكل صحيح على <span className="font-bold text-primary">{resultDetails.score}</span> من <span className="font-bold text-primary">{resultDetails.totalQuestions}</span> أسئلة.
                </div>
                <div className={`flex items-center justify-center gap-2 text-md sm:text-lg font-semibold ${isPassed ? 'text-green-400' : 'text-destructive'}`}>
                    {isPassed ? <CheckCircle /> : <XCircle />}
                    <span>{isPassed ? 'لقد اجتزت الامتحان بنجاح' : 'حظ أوفر في المرة القادمة'}</span>
                </div>
                 
                 <Accordion type="single" collapsible className="w-full text-right mt-8">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2">
                                <List className="h-5 w-5" />
                                <span className="font-headline">مراجعة الأسئلة</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4 pt-4">
                                {questions.length > 0 && resultDetails.answers && questions.map((q, index) => {
                                    const studentAnswer = resultDetails.answers[q.id];
                                    const isCorrect = studentAnswer === q.correctAnswer;
                                    return (
                                        <div key={q.id} className={`p-4 rounded-lg border text-sm ${isCorrect ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                                            <p className="font-semibold mb-3">{index + 1}. {q.text}</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">إجابتك:</span>
                                                    <Badge variant={isCorrect ? 'default' : 'destructive'} className={isCorrect ? 'bg-green-600' : ''}>{studentAnswer || "لم تجب"}</Badge>
                                                    {isCorrect ? <Check className="h-5 w-5 text-green-500"/> : <X className="h-5 w-5 text-destructive"/>}
                                                </div>
                                                {!isCorrect && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold">الإجابة الصحيحة:</span>
                                                        <Badge variant="outline">{q.correctAnswer}</Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                 
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full font-headline mt-4">
                    <Link href="/dashboard">
                        <Home className="ml-2 h-4 w-4" />
                        العودة إلى لوحة التحكم
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}


export default function ExamResultPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen w-full">...جاري تحميل النتائج</div>}>
            <ResultsPageContent />
        </Suspense>
    )
}
