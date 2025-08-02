
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
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle, Timer, Loader2, Download, FileUp, CircleCheck } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { nanoid } from 'nanoid';
import { User } from 'firebase/auth';

// --- MCQ Exam Interfaces ---
interface MCQQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}
type Answers = { [key: string]: string; };

// --- File Exam Interfaces ---
interface Submission {
  id: string;
  fileUrl: string;
  submittedAt: Date;
}

// --- Common Exam Interfaces ---
interface ExamDetails {
  id: string;
  title: string;
  description: string;
  type: 'mcq' | 'file';
  grade: string; // Added grade
  duration?: number; // Only for MCQ
  fileUrl?: string; // Only for File
}

export default function ExamTakingPage() {
  const params = useParams();
  const examId = params.examId as string;
  const user = auth.currentUser;
  
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!examId || !user) {
        if (!user) setLoading(false);
        return;
    };

    const fetchExamData = async () => {
      try {
        setLoading(true);
        // Check for previous submission
        const resultsQuery = query(collection(db, 'results'), where('studentId', '==', user.uid), where('examId', '==', examId));
        const resultsSnapshot = await getDocs(resultsQuery);

        if (!resultsSnapshot.empty) {
            setHasCompleted(true);
            setLoading(false);
            return;
        }
        setHasCompleted(false);

        // Fetch exam details if not completed
        const examDocRef = doc(db, 'exams', examId);
        const examDocSnap = await getDoc(examDocRef);

        if (!examDocSnap.exists()) {
          setExamDetails(null);
          return;
        }
        const examData = examDocSnap.data();
        setExamDetails({ id: examDocSnap.id, ...(examData as Omit<ExamDetails, 'id'>) });
      } catch (error) {
        console.error("Error fetching exam details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExamData();
  }, [examId, user]);
  
  if (loading || hasCompleted === null) {
    return <LoadingSkeleton />;
  }
  
  if (hasCompleted) {
      return <NotFoundCard message="لقد قمت بتأدية هذا الامتحان بالفعل." />;
  }
  
  if (!examDetails) {
     return <NotFoundCard />;
  }
  
  if (examDetails.type === 'file') {
      return <FileExamComponent exam={examDetails} />;
  }

  return <MCQExamComponent exam={examDetails} />;
}


// =================================================================================
// ============================= MCQ Exam Component ================================
// =================================================================================
function MCQExamComponent({ exam }: { exam: ExamDetails }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(exam.duration ? exam.duration * 60 : null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
   useEffect(() => {
    const fetchQuestions = async () => {
        try {
            const questionsQuery = query(collection(db, `exams/${exam.id}/questions`), orderBy('createdAt'));
            const questionsSnapshot = await getDocs(questionsQuery);
            const questionsList = questionsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as MCQQuestion));
            setQuestions(questionsList);
        } catch (error) {
            toast({ title: "خطأ", description: "حدث خطأ أثناء تحميل أسئلة الامتحان.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    fetchQuestions();
  }, [exam.id, toast]);

  const handleExamSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const user = auth.currentUser;
    if (!user) {
      toast({ title: 'خطأ', description: 'يجب أن تكون مسجلاً للدخول لتقديم الامتحان.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    let score = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        score++;
      }
    });

    try {
      const resultData = {
        studentId: user.uid,
        examId: exam.id,
        score: score,
        totalQuestions: questions.length,
        answers: answers,
        submittedAt: serverTimestamp(),
        type: 'mcq',
        examTitle: exam.title,
        grade: exam.grade,
      };
      
      await addDoc(collection(db, 'results'), resultData);
      
      toast({ title: 'تم التسليم!', description: 'تم استلام إجاباتك بنجاح.' });
      router.push(`/dashboard`);

    } catch (error) {
      console.error("Error submitting exam:", error);
      toast({ title: 'خطأ', description: 'فشل تسليم الامتحان. الرجاء المحاولة مرة أخرى.', variant: 'destructive' });
      setIsSubmitting(false);
    }
  }, [exam, answers, questions, router, toast, isSubmitting]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft === 0) {
      handleExamSubmit();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prevTime => (prevTime ? prevTime - 1 : 0)), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, handleExamSubmit]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <LoadingSkeleton />;
  if (questions.length === 0) return <NotFoundCard message="لم يتم إضافة أسئلة لهذا الامتحان بعد. يرجى المحاولة لاحقاً."/>;

  const currentQuestion = questions[currentQuestionIndex];
  
  return (
    <div className="flex justify-center items-center flex-grow">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-primary text-2xl">{exam.title}</CardTitle>
            <div className={`flex items-center gap-2 font-bold text-lg p-2 rounded-md ${timeLeft !== null && timeLeft < 60 ? 'text-destructive bg-destructive/10' : 'text-primary'}`}>
                <Timer className="h-5 w-5" />
                <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <CardDescription>
            السؤال {currentQuestionIndex + 1} من {questions.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                <p className="text-xl font-semibold text-right" dir="rtl">{currentQuestion.text}</p>
                <RadioGroup
                    value={answers[currentQuestion.id] || ''}
                    onValueChange={(value) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }))}
                    className="space-y-4"
                >
                    {currentQuestion.options.map((option, index) => (
                        <Label key={index} className="flex items-center gap-4 text-lg p-4 rounded-md border hover:bg-muted/50 cursor-pointer has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary transition-colors">
                           <RadioGroupItem value={option} id={`q${currentQuestionIndex}-opt${index}`} />
                           <span className="flex-1 text-right">{option}</span>
                        </Label>
                    ))}
                </RadioGroup>
            </div>
        </CardContent>
        <CardFooter className="flex justify-between flex-wrap gap-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentQuestionIndex(prev => prev - 1)} disabled={currentQuestionIndex === 0}>
                <ArrowRight className="ml-2 h-4 w-4" />
                السابق
              </Button>
              <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)} disabled={currentQuestionIndex === questions.length - 1} className="mr-2">
                التالي
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={Object.keys(answers).length !== questions.length || isSubmitting}>
                        {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle className="ml-2 h-4 w-4" />}
                        إنهاء وتسليم الإجابة
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد من تسليم الإجابة؟</AlertDialogTitle><AlertDialogDescription>بمجرد تسليم إجاباتك، لا يمكنك العودة لتغييرها. سيتم تسجيل نتيجتك.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleExamSubmit} disabled={isSubmitting}>{isSubmitting ? 'جاري التسليم...' : 'نعم، قم بالتسليم'}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}


// =================================================================================
// ============================= File Exam Component ===============================
// =================================================================================
function FileExamComponent({ exam }: { exam: ExamDetails }) {
    const router = useRouter();
    const { toast } = useToast();
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingSubmission, setLoadingSubmission] = useState(true);
    const user = auth.currentUser;

    const checkForSubmission = useCallback(async () => {
        if (!user) return;
        setLoadingSubmission(true);
        try {
            const q = query(collection(db, 'results'), where('studentId', '==', user.uid), where('examId', '==', exam.id));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const subDoc = querySnapshot.docs[0];
                const subData = subDoc.data();
                setSubmission({
                    id: subDoc.id,
                    fileUrl: subData.fileUrl,
                    submittedAt: new Date(subData.submittedAt.seconds * 1000)
                });
            }
        } catch (error) {
            console.error("Error checking for submission:", error);
            toast({ title: "خطأ", description: "فشل في التحقق من وجود تسليم سابق.", variant: "destructive" });
        } finally {
            setLoadingSubmission(false);
        }
    }, [user, exam.id, toast]);
    
    useEffect(() => {
        checkForSubmission();
    }, [checkForSubmission]);

    const handleFileSubmit = async () => {
        if (!selectedFile || !user) {
            toast({ title: 'خطأ', description: 'الرجاء اختيار ملف لرفعه.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        
        const uniqueFileName = `${nanoid()}-${selectedFile.name}`;
        const filePath = `exam_answers/${user.uid}/${exam.id}/${uniqueFileName}`;
        const storageRef = ref(storage, filePath);

        try {
            await uploadBytes(storageRef, selectedFile);
            const fileUrl = await getDownloadURL(storageRef);
            
            await addDoc(collection(db, 'results'), {
                studentId: user.uid,
                examId: exam.id,
                fileUrl,
                filePath,
                submittedAt: serverTimestamp(),
                type: 'file',
                examTitle: exam.title,
                grade: exam.grade,
            });

            toast({ title: 'تم التسليم بنجاح!', description: 'تم رفع ملف إجابتك.' });
            checkForSubmission(); // Refresh submission status
        } catch (error) {
            console.error("Error submitting file exam:", error);
            toast({ title: 'خطأ', description: 'فشل رفع الملف. الرجاء المحاولة مرة أخرى.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="flex justify-center items-center flex-grow">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="font-headline text-primary text-2xl">{exam.title}</CardTitle>
                    <CardDescription>{exam.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-bold mb-2">ملف الأسئلة</h3>
                        <Button asChild>
                            <a href={exam.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="ml-2 h-4 w-4" />
                                تحميل الأسئلة (PDF)
                            </a>
                        </Button>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="font-bold mb-4">تسليم الإجابة</h3>
                        {loadingSubmission ? (
                           <Skeleton className="h-10 w-full" />
                        ) : submission ? (
                            <div className="flex flex-col items-center gap-4 text-center p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
                               <CircleCheck className="h-12 w-12 text-green-400"/>
                               <p className="font-bold text-lg">لقد قمت بتسليم هذا الامتحان بالفعل.</p>
                               <p className="text-sm text-muted-foreground">
                                   تاريخ التسليم: {submission.submittedAt.toLocaleString('ar-EG')}
                               </p>
                               <Button asChild variant="secondary">
                                   <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                                        عرض/تنزيل إجابتي
                                   </a>
                               </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    بعد حل الأسئلة في ملف منفصل، قم برفعه هنا.
                                </p>
                                <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                                <Button onClick={handleFileSubmit} disabled={isSubmitting || !selectedFile} className="w-full">
                                    {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <FileUp className="ml-2 h-4 w-4" />}
                                    {isSubmitting ? 'جاري الرفع...' : 'تسليم ملف الإجابة'}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
                 <CardFooter>
                    <Button onClick={() => router.push('/exams')} variant="outline" className="w-full">
                        <ArrowRight className="ml-2 h-4 w-4" />
                        العودة لصفحة الامتحانات
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
    <div className="flex justify-center items-center h-[60vh]">
        <Card className="w-full max-w-3xl">
            <CardHeader><Skeleton className="h-8 w-3/4 mb-2" /><Skeleton className="h-5 w-1/4" /></CardHeader>
            <CardContent className="space-y-6"><Skeleton className="h-6 w-full" /><div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent>
            <CardFooter className="flex justify-between"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></CardFooter>
        </Card>
    </div>
);

const NotFoundCard = ({ message = "لم نتمكن من العثور على تفاصيل هذا الامتحان." }) => {
    const router = useRouter();
    return (
        <div className="flex justify-center items-center h-[60vh]">
            <Card className="w-full max-w-md text-center p-8">
                <CardHeader>
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle>خطأ في تحميل الامتحان</CardTitle>
                </CardHeader>
                <CardContent><p>{message} الرجاء العودة والمحاولة مرة أخرى.</p></CardContent>
                <CardFooter>
                    <Button onClick={() => router.push('/exams')} className="w-full">
                        العودة لصفحة الامتحانات
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};
