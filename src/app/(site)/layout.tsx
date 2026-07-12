import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageTransition from "@/components/layout/PageTransition";

// Chrome for the division-agnostic pages (Contact). The portal homepage, the
// Studio page, and the Work showcase render outside this group and bring their
// own navigation, so they never inherit this navbar/footer.
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className="relative z-[1]">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </>
  );
}
