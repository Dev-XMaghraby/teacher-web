
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BookOpen, Download } from 'lucide-react';

interface LibraryFile {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  grade: string;
}

interface UserProfile {
    grade: string;
}

export default function LibraryPage() {
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        } else {
            setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchLibraryFiles = useCallback(async (grade: string) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'library'), 
        where('grade', '==', grade), 
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      setLibraryFiles(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryFile)));
    } catch (error) {
      console.error("Error fetching library files: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userProfile?.grade) {
      fetchLibraryFiles(userProfile.grade);
    }
  }, [userProfile, fetchLibraryFiles]);

  const renderSkeleton = () => (
    Array.from({ length: 4 }).map((_, index) => (
      <Card key={`skeleton-${index}`} className="flex flex-col">
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
         <CardContent className="flex-grow">
            <Skeleton className="h-10 w-1/2" />
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
        <h1 className="text-lg font-semibold md:text-2xl font-headline">المكتبة والمؤلفات</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          renderSkeleton()
        ) : libraryFiles.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-10">
            <p>لا توجد ملفات متاحة لصفك الدراسي حاليًا.</p>
          </div>
        ) : (
          libraryFiles.map((file) => (
            <Card key={file.id} className="flex flex-col hover:border-primary transition-all">
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-3 rounded-lg">
                            <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="font-headline text-primary">{file.title}</CardTitle>
                            {file.description && <CardDescription>{file.description}</CardDescription>}
                        </div>
                    </div>
                </CardHeader>
                 <CardContent className="flex-grow" />
                <CardFooter>
                    <Button asChild className="w-full font-headline">
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" download>
                            <Download className="ml-2 h-4 w-4" />
                            تحميل الملف
                        </a>
                    </Button>
                </CardFooter>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
