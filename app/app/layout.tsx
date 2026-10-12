import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

/**
 * App shell for the analytics workspace (/app/*):
 * fixed sidebar + sticky navbar + footer around every dashboard page.
 * The marketing landing page at / keeps the bare root layout.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-w-0 min-h-screen">
      <Sidebar />
      <div className="flex w-full min-w-0 min-h-screen flex-col md:pl-[220px]">
        <Navbar />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 md:pt-6">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
