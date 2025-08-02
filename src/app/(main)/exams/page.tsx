
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, BarChart2, FileUp, CheckCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { GRADE_LEVELS } from '@/lib/client-constants';

interface Exam {
  id: string;
  title: string;
  description: string;
  grade: string;
  type: 'mcq' | 'file';
  questions?: number;
  duration?: number;
  resultsPublished?: boolean;
  createdAt?: { seconds: number, nanoseconds: number };
}

interface Result {
  examId: string;
  id: string;
  type: 'mcq' | 'file';
}

interface UserProfile {
    grade: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedResults, setCompletedResults] = useState<Map<string, Result>>(new Map());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchData = useCallback(async (currentUser: User) => {
    setLoading(true);
    try {
      // Step 1: Get user profile to find their grade.
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists() || !userDoc.data()?.grade) {
        setUserProfile(null);
        setExams([]);
        setLoading(false);
        return;
      }
      
      const profile = userDoc.data() as UserProfile;
      setUserProfile(profile);

      // Step 2: Use the grade to fetch relevant exams and results.
      const examsQuery = query(
        collection(db, 'exams'),
        where('grade', '==', profile.grade)
      );
      const resultsQuery = query(collection(db, 'results'), where('studentId', '==', currentUser.uid));

      const [examsSnapshot, resultsSnapshot] = await Promise.all([
        getDocs(examsQuery),
        getDocs(resultsQuery)
      ]);

      const resultsMap = new Map<string, Result>();
      resultsSnapshot.forEach(doc => {
        const data = doc.data();
        resultsMap.set(data.examId, { id: doc.id, examId: data.examId, type: data.type });
      });
      setCompletedResults(resultsMap);

      let examsList = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      
      // Sort exams by creation date in descending order (newest first)
      examsList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      setExams(examsList);

    } catch (error) {
        console.error("Error fetching data: ", error);
        setExams([]);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchData(currentUser);
      } else {
        setLoading(false);
        setExams([]);
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, [fetchData]);

  const getGradeLabel = (value: string) => GRADE_LEVELS.find(level => level.value === value)?.label || value;

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, index) => (
      <Card key={`skeleton-${index}`} className="flex flex-col">
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mt-1" />
        </CardHeader>
        <CardContent className="flex-grow space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-2">
             <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
             <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
        <CardFooter>
            <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    ))
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">الامتحانات المتاحة</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          renderSkeleton()
        ) : !user ? (
          <div className="col-span-full text-center text-muted-foreground py-10">
              <p>يرجى تسجيل الدخول لرؤية الامتحانات.</p>
          </div>
        ) : !userProfile?.grade ? (
          <div className="col-span-full text-center text-muted-foreground py-10">
             <p>يرجى إكمال بيانات صفك الدراسي في <Link href="/profile" className="text-primary hover:underline">صفحتك الشخصية</Link> لعرض الامتحانات.</p>
          </div>
        ) : exams.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-10">
                <p>لا توجد امتحانات متاحة لصفك الدراسي ({getGradeLabel(userProfile.grade)}) حاليًا.</p>
            </div>
        ) : (
          exams.map((exam) => {
            const result = completedResults.get(exam.id);
            const isCompleted = !!result;
            const resultsPublished = exam.resultsPublished === true;
            const isMCQ = exam.type === 'mcq';

            return (
                <Card key={exam.id} className="flex flex-col hover:border-primary transition-all">
                <CardHeader>
                    <CardTitle className="font-headline text-primary">{exam.title}</CardTitle>
                    <CardDescription>{exam.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-primary" />
                        <span>{getGradeLabel(exam.grade)}</span>
                    </div>
                    {isMCQ ? (
                        <>
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>{exam.questions} سؤال</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>{exam.duration} دقيقة</span>
                        </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <FileUp className="h-4 w-4 text-primary" />
                            <span>امتحان يتطلب رفع ملف</span>
                        </div>
                    )}
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="w-full">
                        {isCompleted ? (
                           (isMCQ && resultsPublished) ? (
                                <Button asChild className="w-full font-headline" variant="secondary">
                                    <Link href={`/exams/${exam.id}/results?resultId=${result.id}`}>
                                        <Eye className="ml-2 h-4 w-4" />
                                        عرض النتيجة
                                    </Link>
                                </Button>
                           ) : (
                            <Button disabled className="w-full font-headline">
                                <CheckCircle className="h-5 w-5 ml-2" />
                                {isMCQ ? 'تم الإكمال (النتيجة قيد الانتظار)' : 'تم التسليم'}
                            </Button>
                           )
                        ) : (
                            <Button asChild className="w-full font-headline">
                                <Link href={`/exams/${exam.id}`}>بدء الامتحان</Link>
                            </Button>
                        )}
                    </div>
                </CardFooter>
                </Card>
            )
          })
        )}
      </div>
    </>
  );
}
