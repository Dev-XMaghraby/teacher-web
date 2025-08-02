
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, ClipboardList, Dumbbell, Sparkles, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, query, where, getDocs, doc, getDoc, getCountFromServer } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { AiTutor } from '@/components/ai-tutor';
import { format } from 'date-fns';

interface ExamResult {
  id: string;
  examTitle: string;
  grade: string;
  status: 'completed' | 'pending';
  score: string;
  date: string;
  submittedAt: any;
}

interface StudentStats {
    availableExams: number;
    averageScore: number;
}

export default function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [recentExams, setRecentExams] = useState<ExamResult[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isTutorOpen, setTutorOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const fetchRecentExams = async (currentUser: User) => {
      try {
        setLoadingExams(true);
        // Firestore requires a composite index for queries with `where` and `orderBy` on different fields.
        // To avoid this requirement, we fetch without `orderBy` and sort in the client code.
        const resultsQuery = query(
          collection(db, 'results'),
          where('studentId', '==', currentUser.uid)
        );
        
        const resultsSnapshot = await getDocs(resultsQuery);

        let examsList = resultsSnapshot.docs.map(resultDoc => {
            const resultData = resultDoc.data();
            
            return {
              id: resultDoc.id,
              examTitle: resultData.examTitle || "امتحان",
              grade: resultData.grade || "غير محدد",
              status: 'completed',
              score: `${resultData.score}/${resultData.totalQuestions}`,
              date: resultData.submittedAt ? format(new Date(resultData.submittedAt.seconds * 1000), 'dd/MM/yyyy') : 'N/A',
              submittedAt: resultData.submittedAt,
            } as ExamResult;
        });

        // Sort manually by date descending and take the latest 5
        examsList.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        setRecentExams(examsList.slice(0, 5));

      } catch (error) {
        console.error("Error fetching recent exams:", error);
      } finally {
        setLoadingExams(false);
      }
    };
  
  const fetchStats = async (currentUser: User) => {
    try {
        setLoadingStats(true);
        const resultsCollection = collection(db, 'results');

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        let availableExams = 0;
        if (userDoc.exists() && userDoc.data()?.grade) {
          const userGrade = userDoc.data()?.grade;
          if (userGrade) {
            const examsQuery = query(collection(db, 'exams'), where('grade', '==', userGrade));
            const examsSnapshot = await getCountFromServer(examsQuery);
            availableExams = examsSnapshot.data().count;
          }
        }

        const resultsQuery = query(resultsCollection, where('studentId', '==', currentUser.uid));
        const resultsSnapshot = await getDocs(resultsQuery);
        
        let totalPercentage = 0;
        resultsSnapshot.docs.forEach(doc => {
            const resultData = doc.data();
            if(resultData.totalQuestions > 0){
                totalPercentage += (resultData.score / resultData.totalQuestions) * 100;
            }
        });
        
        const averageScore = resultsSnapshot.size > 0 ? Math.round(totalPercentage / resultsSnapshot.size) : 0;
        
        setStats({
            availableExams: availableExams,
            averageScore: averageScore
        });

    } catch (error) {
        console.error("Error fetching stats:", error);
    } finally {
        setLoadingStats(false);
    }
  };


  useEffect(() => {
    if (user) {
        fetchRecentExams(user);
        fetchStats(user);
    } else {
        setLoadingExams(false);
        setLoadingStats(false);
    }
  }, [user]);

  const renderExamSkeleton = () => (
    Array.from({length: 3}).map((_, index) => (
      <TableRow key={index}>
        <TableCell>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24 mt-1" />
        </TableCell>
        <TableCell className="hidden sm:table-cell text-center"><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
        <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
        <TableCell className="hidden text-left sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">لوحة تحكم الطالب</h1>
        <Button onClick={() => setTutorOpen(true)} variant="outline" className="gap-2 w-full sm:w-auto">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>اسأل المعلم الذكي</span>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card className="hover:border-primary transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الامتحانات المتاحة</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loadingStats || !stats ? <Skeleton className="h-8 w-10" /> : <div className="text-2xl font-bold">{stats.availableExams}</div>}
            <p className="text-xs text-muted-foreground">امتحانات متاحة لصفك الدراسي</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط درجاتك</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats || !stats ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.averageScore}%</div>}
            <p className="text-xs text-muted-foreground">في كل الامتحانات</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">شروحات جديدة</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+5</div>
            <p className="text-xs text-muted-foreground">فيديوهات تمت إضافتها هذا الأسبوع</p>
          </CardContent>
        </Card>
        <Card className="hover:border-primary transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مؤلفات جديدة</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2</div>
            <p className="text-xs text-muted-foreground">كتب جديدة في المكتبة</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>الامتحانات الأخيرة</CardTitle>
              <CardDescription>
                نتائج آخر الامتحانات التي قمت بتأديتها.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/exams">
                عرض الكل
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الامتحان</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">الحالة</TableHead>
                  <TableHead className="text-center">الدرجة</TableHead>
                  <TableHead className="hidden sm:table-cell text-left">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingExams ? (
                  renderExamSkeleton()
                ) : recentExams.length > 0 ? (
                  recentExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <div className="font-medium">{exam.examTitle}</div>
                        <div className="text-sm text-muted-foreground">
                          {exam.grade}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <Badge variant="outline" className="text-green-400 border-green-400/50">مكتمل</Badge>
                      </TableCell>
                      <TableCell className="text-center">{exam.score}</TableCell>
                      <TableCell className="hidden sm:table-cell text-left">{exam.date}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      لم تقم بتأدية أي امتحانات بعد.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AiTutor open={isTutorOpen} onOpenChange={setTutorOpen} />
    </>
  );
}
