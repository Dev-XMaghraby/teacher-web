
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Youtube } from 'lucide-react';

interface Explanation {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  grade: string;
}

interface UserProfile {
    grade: string;
}

export default function ExplanationsPage() {
  const [explanations, setExplanations] = useState<Explanation[]>([]);
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

  const fetchExplanations = useCallback(async (grade: string) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'explanations'), 
        where('grade', '==', grade), 
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      setExplanations(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Explanation)));
    } catch (error) {
      console.error("Error fetching explanations: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userProfile?.grade) {
      fetchExplanations(userProfile.grade);
    }
  }, [userProfile, fetchExplanations]);

  const renderSkeleton = () => (
    Array.from({ length: 4 }).map((_, index) => (
      <Card key={`skeleton-${index}`}>
        <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-full" /></CardHeader>
        <CardContent><Skeleton className="h-10 w-full" /></CardContent>
      </Card>
    ))
  );
  
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">الشروحات</h1>
      </div>
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          renderSkeleton()
        ) : explanations.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-10">
            <p>لا توجد شروحات متاحة لصفك الدراسي حاليًا.</p>
          </div>
        ) : (
          explanations.map((exp) => {
            const videoId = getYouTubeVideoId(exp.videoUrl);
            return (
              <Dialog key={exp.id}>
                <DialogTrigger asChild>
                  <Card className="flex flex-col hover:border-primary transition-all cursor-pointer">
                    <CardHeader>
                      <CardTitle className="font-headline text-primary">{exp.title}</CardTitle>
                      {exp.description && <CardDescription>{exp.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                      <div className="w-full text-center">
                          <Youtube className="h-16 w-16 text-red-500 mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">اضغط للمشاهدة</p>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{exp.title}</DialogTitle>
                    {exp.description && <DialogDescription>{exp.description}</DialogDescription>}
                  </DialogHeader>
                  {videoId ? (
                     <AspectRatio ratio={16 / 9}>
                      <iframe
                        className="w-full h-full rounded-md"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={exp.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </AspectRatio>
                  ) : (
                    <p className="text-destructive">رابط الفيديو غير صالح.</p>
                  )}
                </DialogContent>
              </Dialog>
            );
          })
        )}
      </div>
    </>
  );
}
