'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

const withAdminAuth = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const WithAdminAuthComponent = (props: P) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            // If not an admin, redirect to student dashboard
            router.push('/dashboard');
          }
        } else {
          // If not logged in, redirect to login page
          router.push('/login');
        }
        setLoading(false);
      });

      return () => unsubscribe();
    }, [router]);

    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    // Render the component only if the user is an admin
    if(!isAdmin) {
        return null; // Or a loading spinner, or a not-authorized message
    }

    return <WrappedComponent {...props} />;
  };

  WithAdminAuthComponent.displayName = `WithAdminAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return WithAdminAuthComponent;
};

export default withAdminAuth;
