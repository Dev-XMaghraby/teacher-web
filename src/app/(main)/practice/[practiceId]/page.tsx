'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, orderBy, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle, Lightbulb, Loader2, Download, FileUp, CircleCheck, Info, Repeat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- MCQ Practice Interfaces ---
interface MCQQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}
type Answers = { [key: string]: string; };
type AnswerStatus = 'correct' | 'incorrect' | 'unanswered';


// --- Common Practice Interfaces ---
interface PracticeDetails {
  id: string;
  title: string;
  description: string;
  type: 'mcq' | 'file';
  fileUrl?: string; // Only for File
}

export default function PracticeTakingPage() {
  const params = useParams();
  const practiceId = params.practiceId as string;
  
  const [practiceDetails, setPracticeDetails] = useState<PracticeDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!practiceId) return;

    const fetchPracticeDetails = async () => {
      try {
        setLoading(true);
        const practiceDocRef = doc(db, 'practice', practiceId);
        const practiceDocSnap = await getDoc(practiceDocRef);

        if (!practiceDocSnap.exists()) {
          // Handle not found
          return;
        }
        const practiceData = practiceDocSnap.data();
        setPracticeDetails({ id: practiceDocSnap.id, ...(practiceData as Omit<PracticeDetails, 'id'>) });
      } catch (error) {
        console.error("Error fetching practice details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPracticeDetails();
  }, [practiceId]);

  if (loading) {
    return <LoadingSkeleton />;
  }
  
  if (!practiceDetails) {
     return <NotFoundCard />;
  }
  
  if (practiceDetails.type === 'file') {
      return <FilePracticeComponent practice={practiceDetails} />;
  }

  return <MCQPracticeComponent practice={practiceDetails} />;
}


// =================================================================================
// ============================= MCQ Practice Component ================================
// =================================================================================
function MCQPracticeComponent({ practice }: { practice: PracticeDetails }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [answerStatuses, setAnswerStatuses] = useState<{ [key: string]: AnswerStatus }>({});
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  
   useEffect(() => {
    const fetchQuestions = async () => {
        try {
            const questionsQuery = query(collection(db, `practice/${practice.id}/questions`), orderBy('createdAt'));
            const questionsSnapshot = await getDocs(questionsQuery);
            const questionsList = questionsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as MCQQuestion));
            setQuestions(questionsList);
        } catch (error) {
            toast({ title: "خطأ", description: "حدث خطأ أثناء تحميل أسئلة التدريب.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    fetchQuestions();
  }, [practice.id, toast]);

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    const currentQuestion = questions.find(q => q.id === questionId);
    if (!currentQuestion) return;

    if (answer === currentQuestion.correctAnswer) {
      setAnswerStatuses(prev => ({ ...prev, [questionId]: 'correct' }));
    } else {
      setAnswerStatuses(prev => ({ ...prev, [questionId]: 'incorrect' }));
    }
  };

  const handleFinishPractice = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast({ title: 'خطأ', description: 'يجب أن تكون مسجلاً للدخول.', variant: 'destructive' });
      return;
    }
    
    let score = 0;
    questions.forEach(q => {
        if (answers[q.id] === q.correctAnswer) {
            score++;
        }
    });

    try {
        await addDoc(collection(db, 'practiceResults'), {
            studentId: user.uid,
            practiceId: practice.id,
            score: score,
            totalQuestions: questions.length,
            answers: answers,
            submittedAt: serverTimestamp(),
        });
        setIsFinished(true);
        toast({ title: 'أحسنت!', description: 'تم إنهاء التدريب بنجاح، يمكنك مراجعة إجاباتك.' });
    } catch(err) {
        console.error("Error saving practice result: ", err);
        toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ نتيجتك.", variant: "destructive" });
    }
  };
  
  const handleRestart = () => {
    setAnswers({});
    setAnswerStatuses({});
    setIsFinished(false);
    setCurrentQuestionIndex(0);
  }

  if (loading) return <LoadingSkeleton />;
  if (questions.length === 0) return <NotFoundCard message="لا توجد أسئلة في هذا التدريب."/>;
  
  const currentQuestion = questions[currentQuestionIndex];
  const answerStatus = answerStatuses[currentQuestion.id] || 'unanswered';
  const selectedAnswer = answers[currentQuestion.id] || null;

  return (
    <div className="flex justify-center items-center flex-grow">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-primary text-2xl">{practice.title}</CardTitle>
          </div>
          <CardDescription>
            السؤال {currentQuestionIndex + 1} من {questions.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                <p className="text-xl font-semibold text-right" dir="rtl">{currentQuestion.text}</p>
                <RadioGroup
                    value={selectedAnswer || ''}
                    onValueChange={(value) => handleSelectAnswer(currentQuestion.id, value)}
                    className="space-y-4"
                    disabled={answerStatus !== 'unanswered' || isFinished}
                >
                    {currentQuestion.options.map((option, index) => {
                       const isCorrect = option === currentQuestion.correctAnswer;
                       const isSelected = option === selectedAnswer;

                        return (
                           <Label key={index} className={cn(
                               "flex items-center gap-4 text-lg p-4 rounded-md border transition-colors",
                               (answerStatus === 'unanswered' && !isFinished) && "cursor-pointer hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary",
                               (answerStatus !== 'unanswered' || isFinished) && isCorrect && "bg-green-500/10 border-green-500/50 text-green-200",
                               answerStatus === 'incorrect' && isSelected && "bg-red-500/10 border-red-500/50 text-red-200"
                           )}>
                               <RadioGroupItem value={option} id={`q${currentQuestionIndex}-opt${index}`} />
                               <span className="flex-1 text-right">{option}</span>
                           </Label>
                       )
                    })}
                </RadioGroup>
                
                {(answerStatus === 'incorrect' || (isFinished && answerStatuses[currentQuestion.id] === 'incorrect')) && currentQuestion.explanation && (
                    <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>شرح الإجابة</AlertTitle>
                        <AlertDescription>{currentQuestion.explanation}</AlertDescription>
                    </Alert>
                )}
                 {(answerStatus === 'correct' || (isFinished && answerStatuses[currentQuestion.id] === 'correct')) && currentQuestion.explanation && (
                    <Alert variant="default" className="bg-green-500/10 border-green-500/30">
                        <Lightbulb className="h-4 w-4 text-green-400" />
                        <AlertTitle className="text-green-400">شرح وتوضيح</AlertTitle>
                        <AlertDescription className="text-green-300/80">{currentQuestion.explanation}</AlertDescription>
                    </Alert>
                )}
            </div>
        </CardContent>
        <CardFooter className="flex justify-between flex-wrap gap-4">
            {isFinished ? (
                 <div className='flex gap-2'>
                    <Button onClick={handleRestart}>
                       <Repeat className="ml-2 h-4 w-4" />
                       إعادة التدريب
                    </Button>
                     <Button variant="outline" onClick={() => router.push('/practice')}>
                        العودة للتدريبات
                    </Button>
                </div>
            ) : (
                <div className='flex gap-2'>
                    <Button onClick={() => setCurrentQuestionIndex(prev => prev - 1)} disabled={currentQuestionIndex === 0} variant="outline">
                       <ArrowRight className="ml-2 h-4 w-4" />
                        السابق
                    </Button>
                    {currentQuestionIndex < questions.length - 1 ? (
                         <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} disabled={answerStatus === 'unanswered'}>
                            التالي
                            <ArrowLeft className="mr-2 h-4 w-4" />
                         </Button>
                    ) : (
                        <Button onClick={handleFinishPractice} disabled={answerStatus === 'unanswered'}>
                           <CheckCircle className="ml-2 h-4 w-4" />
                           إنهاء التدريب
                        </Button>
                    )}
                </div>
            )}
             <div>
                {!isFinished && (
                     <Button variant="outline" onClick={() => router.push('/practice')}>
                        الخروج
                    </Button>
                )}
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}


// =================================================================================
// ============================= File Practice Component ===============================
// =================================================================================
function FilePracticeComponent({ practice }: { practice: PracticeDetails }) {
    const router = useRouter();
    
    return (
        <div className="flex justify-center items-center flex-grow">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="font-headline text-primary text-2xl">{practice.title}</CardTitle>
                    <CardDescription>{practice.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-bold mb-2">ملف الأسئلة</h3>
                        <Button asChild>
                            <a href={practice.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="ml-2 h-4 w-4" />
                                تحميل الأسئلة (PDF)
                            </a>
                        </Button>
                    </div>

                    <div className="border-t pt-6">
                       <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>تدريب للمراجعة الذاتية</AlertTitle>
                          <AlertDescription>هذا النوع من التدريبات مخصص للمراجعة الذاتية. لا يتطلب رفع ملف إجابة.</AlertDescription>
                       </Alert>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={() => router.push('/practice')} variant="outline" className="w-full">
                        <ArrowRight className="ml-2 h-4 w-4" />
                        العودة لصفحة التدريبات
                    </Button>
                 </CardFooter>
            </Card>
        </div>
    );
}


// =================================================================================
// ============================= Helper Components =================================
// =================================================================================
const LoadingSkeleton = () => (
    <div className="flex justify-center items-center flex-grow h-[60vh]">
        <Card className="w-full max-w-3xl">
            <CardHeader><Skeleton className="h-8 w-3/4 mb-2" /><Skeleton className="h-5 w-1/4" /></CardHeader>
            <CardContent className="space-y-6"><Skeleton className="h-6 w-full" /><div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent>
            <CardFooter className="flex justify-between"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></CardFooter>
        </Card>
    </div>
);

const NotFoundCard = ({ message = "لم نتمكن من العثور على تفاصيل هذا التدريب." }) => {
    const router = useRouter();
    return (
        <div className="flex justify-center items-center flex-grow h-[60vh]">
            <Card className="w-full max-w-md text-center p-8">
                <CardHeader>
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle>خطأ في تحميل التدريب</CardTitle>
                </CardHeader>
                <CardContent><p>{message} الرجاء العودة والمحاولة مرة أخرى.</p></CardContent>
                <CardFooter>
                    <Button onClick={() => router.push('/practice')} className="w-full">
                        العودة لصفحة التدريبات
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};
