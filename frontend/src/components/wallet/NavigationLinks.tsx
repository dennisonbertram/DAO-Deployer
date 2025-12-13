// Navigation links component
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function NavigationLinks() {
  return (
    <div className="hidden sm:flex items-center gap-2">
      <Button asChild variant="ghost">
        <Link href="/explore">Explore</Link>
      </Button>
      <Button asChild>
        <Link href="/deploy">Deploy</Link>
      </Button>
    </div>
  );
}
