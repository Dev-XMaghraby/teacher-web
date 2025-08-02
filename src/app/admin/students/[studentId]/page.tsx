
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, User, Mail, Phone, GraduationCap, BarChart2 } from 'lucide-react';
import { GRADE_LEVELS } from '@/lib/client-constants';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import withAdminAuth from '@/components/withAdminAuth';
import { format } from 'date-fns';

interface Student {
  username: string;
  email: string;
  phone: string;
  grade: string;
}

interface Result {
  id: string;
  examId: string;
  score: number;
  totalQuestions: number;
  submittedAt: { seconds: number };
  examTitle: string;
}

function StudentAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const { toast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const studentDocRef = doc(db, 'users', studentId);
      const studentDocSnap = await getDoc(studentDocRef);

      if (!studentDocSnap.exists()) {
        toast({ title: 'خطأ', description: 'الطالب غير موجود.', variant: 'destructive' });
        router.push('/admin/students');
        return;
      }
      setStudent(studentDocSnap.data() as Student);

      // Fetch exams and results in parallel
      const [examsSnapshot, resultsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'exams'))),
        getDocs(query(collection(db, 'results'), where('studentId', '==', studentId)))
      ]);

      const examsMap = new Map(examsSnapshot.docs.map(doc => [doc.id, doc.data().title]));
      
      let resultsList = resultsSnapshot.docs.map(resultDoc => {
          const resultData = resultDoc.data();
          return {
            id: resultDoc.id,
            examTitle: examsMap.get(resultData.examId) || 'امتحان محذوف',
            ...resultData
          } as Result;
      });

      // Sort results manually by date descending
      resultsList.sort((a, b) => b.submittedAt.seconds - a.submittedAt.seconds);
      setResults(resultsList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: 'خطأ', description: 'فشل في جلب بيانات الطالب.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [studentId, router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getGradeLabel = (value: string) => GRADE_LEVELS.find(level => level.value === value)?.label || value;

  if (loading || !student) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" onClick={() => router.push('/admin/students')} className="mb-2">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للطلاب
          </Button>
          <h1 className="text-lg font-semibold md:text-2xl font-headline">
            ملف الطالب: <span className="text-primary">{student.username}</span>
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>بيانات الطالب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <span>{student.username}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span>{student.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span dir="ltr">{student.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <span>{getGradeLabel(student.grade)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Results Table Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>سجل الامتحانات</CardTitle>
            <CardDescription>قائمة بجميع الامتحانات التي أداها الطالب.</CardDescription>
          </CardHeader>
          <CardContent>
             {results.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>الامتحان</TableHead>
                            <TableHead className="text-center">الدرجة</TableHead>
                            <TableHead className="text-center">النسبة المئوية</TableHead>
                            <TableHead>تاريخ التسليم</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.map((result) => (
                            <TableRow key={result.id}>
                                <TableCell className="font-medium">{result.examTitle}</TableCell>
                                <TableCell className="text-center">{result.score} / {result.totalQuestions}</TableCell>
                                <TableCell className="text-center font-bold">{result.totalQuestions > 0 ? Math.round((result.score / result.totalQuestions) * 100) : 0}%</TableCell>
                                <TableCell>{format(new Date(result.submittedAt.seconds * 1000), 'dd/MM/yyyy')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             ) : (
                <div className="text-center text-muted-foreground py-10">
                    <p>لم يقم هذا الطالب بتأدية أي امتحانات بعد.</p>
                </div>
             )}
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary"/>
                    مخطط الأداء
                </CardTitle>
                <CardDescription>
                    رسم بياني يوضح تطور مستوى الطالب في الامتحانات الأخيرة. (قيد التطوير)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-48 bg-muted/50 rounded-md">
                    <p className="text-muted-foreground">سيتم عرض المخطط البياني هنا قريبًا.</p>
                </div>
            </CardContent>
        </Card>

      </div>
    </>
  );
}

export default withAdminAuth(StudentAnalyticsPage);
