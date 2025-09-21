'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AddMovieRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new /add route
    router.replace('/add');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cinema-black via-cinema-dark to-cinema-gray flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinema-gold mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to Add Movie...</p>
      </div>
    </div>
  );
}