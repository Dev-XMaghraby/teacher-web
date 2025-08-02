
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookCopy, ClipboardEdit, UserCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc,getCountFromServer } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { GRADE_LEVELS } from '@/lib/client-constants';
import { Skeleton } from '@/components/ui/skeleton';
import withAdminAuth from '@/components/withAdminAuth';
import { format } from 'date-fns';

interface Student {
  id: string;
  username: string;
  email: string;
  grade: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

interface Stats {
    totalStudents: number;
    pendingStudents: number;
    totalExams: number;
    totalContent: number;
}

function AdminDashboard() {
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const { toast } = useToast();

  const fetchPendingStudents = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const students: Student[] = [];
      querySnapshot.forEach((doc) => {
        students.push({ id: doc.id, ...(doc.data() as Omit<Student, 'id'>) });
      });
      setPendingStudents(students);
    } catch (error) {
      console.error("Error fetching pending students: ", error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب قائمة الطلاب.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
        setLoadingStats(true);
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const examsCollection = collection(db, 'exams');
        const practiceCollection = collection(db, 'practice');
        const explanationsCollection = collection(db, 'explanations');
        const libraryCollection = collection(db, 'library');
        
        const [studentsSnapshot, examsSnapshot, practiceSnapshot, explanationsSnapshot, librarySnapshot] = await Promise.all([
            getCountFromServer(studentsQuery),
            getCountFromServer(examsCollection),
            getCountFromServer(practiceCollection),
            getCountFromServer(explanationsCollection),
            getCountFromServer(libraryCollection),
        ]);

        const pendingStudentsQuery = query(collection(db, 'users'), where('status', '==', 'pending'));
        const pendingSnapshot = await getCountFromServer(pendingStudentsQuery);

        setStats({
            totalStudents: studentsSnapshot.data().count,
            totalExams: examsSnapshot.data().count + practiceSnapshot.data().count,
            pendingStudents: pendingSnapshot.data().count,
            totalContent: explanationsSnapshot.data().count + librarySnapshot.data().count,
        });

    } catch (error) {
        console.error("Error fetching stats:", error);
         toast({
            title: 'خطأ',
            description: 'فشل في جلب الإحصائيات.',
            variant: 'destructive',
        });
    } finally {
        setLoadingStats(false);
    }
  };


  useEffect(() => {
    fetchPendingStudents();
    fetchStats();
  }, []);

  const handleActivateStudent = async (studentId: string) => {
    try {
      const studentDocRef = doc(db, 'users', studentId);
      await updateDoc(studentDocRef, {
        status: 'active'
      });
      toast({
        title: 'نجاح!',
        description: 'تم تفعيل حساب الطالب بنجاح.',
      });
      // Refresh both lists
      fetchPendingStudents();
      fetchStats();
    } catch (error) {
      console.error("Error activating student: ", error);
      toast({
        title: 'خطأ',
        description: 'فشل في تفعيل حساب الطالب.',
        variant: 'destructive',
      });
    }
  };
  
  const getGradeLabel = (value: string) => {
    const grade = GRADE_LEVELS.find(level => level.value === value);
    return grade ? grade.label : value;
  };

  return (
    <>
        <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl font-headline">لوحة تحكم الأدمن</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Card className="hover:border-primary transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loadingStats ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{stats?.totalStudents}</div> }
                    <p className="text-xs text-muted-foreground">طالب مسجل في المنصة</p>
                </CardContent>
            </Card>
            <Card className="hover:border-primary transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">حسابات في انتظار التفعيل</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     {loadingStats ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold text-yellow-400">{stats?.pendingStudents}</div> }
                    <p className="text-xs text-muted-foreground">طلاب جدد ينتظرون الموافقة</p>
                </CardContent>
            </Card>
            <Card className="hover:border-primary transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الامتحانات</CardTitle>
                    <ClipboardEdit className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                     {loadingStats ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{stats?.totalExams}</div> }
                    <p className="text-xs text-muted-foreground">امتحان وتدريب متاح</p>
                </CardContent>
            </Card>
            <Card className="hover:border-primary transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">محتوى المكتبة والشروحات</CardTitle>
                    <BookCopy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loadingStats ? <Skeleton className="h-7 w-12" /> : <div className="text-2xl font-bold">{stats?.totalContent}</div> }
                    <p className="text-xs text-muted-foreground">ملف وشرح متاح</p>
                </CardContent>
            </Card>
        </div>
        <div className="grid grid-cols-1 auto-rows-max gap-4 md:gap-8 lg:col-span-2">
            <Card>
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                    <CardTitle>الطلاب الجدد</CardTitle>
                    <CardDescription>
                        طلاب جدد في انتظار الموافقة على حساباتهم.
                    </CardDescription>
                    </div>
                    <Button asChild size="sm" className="ml-auto gap-1">
                    <Link href="/admin/students">
                        إدارة الطلاب
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>اسم الطالب</TableHead>
                        <TableHead>البريد الإلكتروني</TableHead>
                        <TableHead>الصف الدراسي</TableHead>
                        <TableHead className="text-left">تاريخ التسجيل</TableHead>
                        <TableHead>
                            <span className="sr-only">Actions</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                           <TableRow>
                                <TableCell colSpan={5} className="text-center">جاري تحميل الطلاب...</TableCell>
                           </TableRow>
                        ) : pendingStudents.length === 0 ? (
                           <TableRow>
                                <TableCell colSpan={5} className="text-center">لا يوجد طلاب في انتظار التفعيل حاليًا.</TableCell>
                           </TableRow>
                        ) : (
                            pendingStudents.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.username}</TableCell>
                                    <TableCell>{student.email}</TableCell>
                                    <TableCell>{getGradeLabel(student.grade)}</TableCell>
                                    <TableCell className="text-left">
                                        {format(new Date(student.createdAt.seconds * 1000), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="outline" onClick={() => handleActivateStudent(student.id)}>تفعيل</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </>
  );
}

export default withAdminAuth(AdminDashboard);
