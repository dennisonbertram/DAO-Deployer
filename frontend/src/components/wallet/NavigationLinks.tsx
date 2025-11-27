// Navigation links component
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function NavigationLinks() {
  return (
    <Button asChild>
      <Link href="/deploy">Deploy DAO</Link>
    </Button>
  );
}
