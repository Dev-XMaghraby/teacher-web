
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, UserCheck, UserX, Search } from 'lucide-react';
import { GRADE_LEVELS } from '@/lib/client-constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import withAdminAuth from '@/components/withAdminAuth';
import { format } from 'date-fns';

interface Student {
  id: string;
  username: string;
  email: string;
  phone: string;
  grade: string;
  status: 'pending' | 'active';
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const studentsList: Student[] = [];
      querySnapshot.forEach((doc) => {
         // We only want to manage students, not other admins
        if (doc.data().role !== 'admin') {
            studentsList.push({ id: doc.id, ...(doc.data() as Omit<Student, 'id'>) });
        }
      });
      setStudents(studentsList);
    } catch (error) {
      console.error("Error fetching students: ", error);
      toast({ title: 'خطأ', description: 'فشل في جلب قائمة الطلاب.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) {
      return students;
    }
    return students.filter(student => 
      student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const handleStatusChange = async (studentId: string, newStatus: 'active' | 'pending') => {
    try {
      const studentDocRef = doc(db, 'users', studentId);
      await updateDoc(studentDocRef, { status: newStatus });
      toast({ title: 'نجاح!', description: `تم تغيير حالة الطالب إلى ${newStatus === 'active' ? 'نشط' : 'قيد الانتظار'}.` });
      fetchStudents(); // Refresh list
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل تحديث حالة الطالب.', variant: 'destructive' });
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      const studentDocRef = doc(db, 'users', studentId);
      await deleteDoc(studentDocRef);
      // Note: This does not delete the user from Firebase Auth.
      // For a full solution, you would need a Cloud Function to handle this.
      toast({ title: 'نجاح!', description: 'تم حذف بيانات الطالب من قاعدة البيانات.' });
      fetchStudents(); // Refresh list
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل حذف الطالب.', variant: 'destructive' });
    }
  };

  const getGradeLabel = (value: string) => {
    const grade = GRADE_LEVELS.find(level => level.value === value);
    return grade ? grade.label : value;
  };
  
  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
         <TableRow key={`skeleton-${index}`}>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell className="text-center"><Skeleton className="h-6 w-16" /></TableCell>
            <TableCell className="text-center"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
         </TableRow>
    ))
  );

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">إدارة الطلاب</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلاب المسجلين</CardTitle>
          <CardDescription>عرض وتعديل بيانات وحالة جميع الطلاب في المنصة.</CardDescription>
          <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث بالاسم أو البريد الإلكتروني..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الطالب</TableHead>
                <TableHead className="hidden md:table-cell">رقم الهاتف</TableHead>
                <TableHead>الصف الدراسي</TableHead>
                <TableHead className="hidden lg:table-cell">تاريخ التسجيل</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? renderSkeleton() : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/students/${student.id}`} className="hover:underline text-primary">
                        {student.username}
                      </Link>
                      <div className="text-xs text-muted-foreground sm:hidden">{student.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-left" dir="ltr">{student.phone}</TableCell>
                    <TableCell>{getGradeLabel(student.grade)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{format(new Date(student.createdAt.seconds * 1000), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className={student.status === 'active' ? 'bg-green-500/80 text-white' : 'bg-yellow-500/80 text-white'}>
                        {student.status === 'active' ? 'نشط' : 'قيد الانتظار'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">فتح القائمة</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {student.status === 'pending' ? (
                               <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'active')}>
                                    <UserCheck className="ml-2 h-4 w-4" />
                                    <span>تفعيل الحساب</span>
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'pending')}>
                                    <UserX className="ml-2 h-4 w-4" />
                                    <span>إلغاء التفعيل</span>
                                </DropdownMenuItem>
                            )}
                            <AlertDialogTrigger asChild>
                               <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                                    <Trash2 className="ml-2 h-4 w-4" />
                                    <span>حذف الطالب</span>
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف بيانات الطالب بشكل دائم من قاعدة البيانات.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStudent(student.id)} className="bg-destructive hover:bg-destructive/90">
                                    نعم، قم بالحذف
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">{searchTerm ? 'لم يتم العثور على طلاب.' : 'لا يوجد طلاب مسجلين حتى الآن.'}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

export default withAdminAuth(AdminStudentsPage);
