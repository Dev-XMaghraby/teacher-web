
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BarChart2, FileUp } from 'lucide-react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { GRADE_LEVELS } from '@/lib/client-constants';

interface Practice {
  id: string;
  title: string;
  description: string;
  grade: string;
  type: 'mcq' | 'file';
  questionsCount?: number;
}

interface UserProfile {
    grade: string;
}

export default function PracticePage() {
  const [practiceItems, setPracticeItems] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);
  
  const fetchPracticeItems = useCallback(async (currentUser: User) => {
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || !userDoc.data()?.grade) {
        console.log("User profile or grade not found.");
        setPracticeItems([]);
        setLoading(false);
        return;
      }
      
      const userProfile = userDoc.data() as UserProfile;
      
      const practiceCollection = collection(db, 'practice');
      const q = query(
        practiceCollection, 
        where('grade', '==', userProfile.grade), 
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const itemsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Practice));
      
      setPracticeItems(itemsList);
    } catch (error) {
      console.error("Error fetching practice items: ", error);
      setPracticeItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
        fetchPracticeItems(user);
    }
  }, [user, fetchPracticeItems]);
  
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
        <h1 className="text-lg font-semibold md:text-2xl font-headline">التدريبات المتاحة</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          renderSkeleton()
        ) : practiceItems.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-10">
                <p>لا توجد تدريبات متاحة لصفك الدراسي حاليًا.</p>
            </div>
        ) : (
          practiceItems.map((item) => (
            <Card key={item.id} className="flex flex-col hover:border-primary transition-all">
              <CardHeader>
                <CardTitle className="font-headline text-primary">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    <span>{getGradeLabel(item.grade)}</span>
                  </div>
                  {item.type === 'mcq' ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>تدريب أسئلة</span>
                      </div>
                  ) : (
                     <div className="flex items-center gap-2">
                        <FileUp className="h-4 w-4 text-primary" />
                        <span>تدريب بملف</span>
                      </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full font-headline">
                  <Link href={`/practice/${item.id}`}>ابدأ التدريب</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
