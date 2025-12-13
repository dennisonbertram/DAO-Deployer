'use client'

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PageErrorBoundaryProps {
  children: ReactNode;
}

export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({ children }) => {
  const customFallback = (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We hit an unexpected error on this page. Try again, or go back home.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button className="flex-1" variant="secondary" asChild>
            <Link href="/">Go to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return <ErrorBoundary fallback={customFallback}>{children}</ErrorBoundary>;
};
