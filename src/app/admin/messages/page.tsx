
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Trash2, MailOpen, MoreHorizontal } from 'lucide-react';
import withAdminAuth from '@/components/withAdminAuth';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: {
    seconds: number;
  };
}

function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactMessage)));
    } catch (error) {
      console.error("Error fetching messages: ", error);
      toast({ title: 'خطأ', description: 'فشل في جلب الرسائل.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const toggleReadStatus = async (id: string, currentStatus: boolean) => {
    try {
      const messageRef = doc(db, 'contactMessages', id);
      await updateDoc(messageRef, { read: !currentStatus });
      toast({ title: 'نجاح', description: 'تم تحديث حالة الرسالة.' });
      fetchMessages();
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل تحديث حالة الرسالة.', variant: 'destructive' });
    }
  };
  
  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, "contactMessages", id));
      toast({ title: "تم الحذف", description: "تم حذف الرسالة بنجاح." });
      fetchMessages();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف الرسالة.", variant: "destructive" });
    }
  };

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
        <TableCell className="text-center"><Skeleton className="h-8 w-8" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <>
      <div className="flex items-center mb-6">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">رسائل التواصل</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>صندوق الوارد</CardTitle>
          <CardDescription>جميع الرسائل المرسلة من نموذج "تواصل معنا".</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المرسل</TableHead>
                <TableHead className="hidden sm:table-cell">الرسالة</TableHead>
                <TableHead className="hidden md:table-cell">التاريخ</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? renderSkeleton() : messages.length > 0 ? (
                messages.map((message) => (
                  <TableRow key={message.id} className={!message.read ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <div className="font-medium">{message.name}</div>
                      <div className="text-xs text-muted-foreground">{message.email}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell max-w-sm truncate">
                        <p title={message.message}>{message.message}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{format(new Date(message.createdAt.seconds * 1000), 'dd/MM/yyyy hh:mm a')}</TableCell>
                    <TableCell className="text-center">
                        <Badge variant={message.read ? 'secondary' : 'default'}>
                            {message.read ? 'مقروءة' : 'جديدة'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                       <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleReadStatus(message.id, message.read)}>
                                {message.read ? <Mail className="ml-2 h-4 w-4" /> : <MailOpen className="ml-2 h-4 w-4" />}
                                <span>{message.read ? 'تحديد كغير مقروءة' : 'تحديد كمقروءة'}</span>
                              </DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-red-500 focus:text-red-500">
                                  <Trash2 className="ml-2 h-4 w-4" />
                                  <span>حذف</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>سيتم حذف هذه الرسالة نهائيًا.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteMessage(message.id)} className="bg-destructive hover:bg-destructive/90">
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
                  <TableCell colSpan={5} className="text-center h-24">لا توجد رسائل حاليًا.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

export default withAdminAuth(AdminMessagesPage);
