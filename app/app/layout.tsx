import AppShell from '@/components/layout/AppShell';

/**
 * App layout for the analytics workspace (/app/*):
 * collapsible sidebar + sticky navbar + footer around every dashboard page.
 * The marketing landing page at / keeps the bare root layout.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
