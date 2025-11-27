'use client'

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface ClientLayoutProps {
  children: ReactNode;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  return <ErrorBoundary>{children}</ErrorBoundary>;
};
