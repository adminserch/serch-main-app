import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[#faf9fa] text-[#1b1c1d] font-body selection:bg-primary-container selection:text-on-primary-container">
      {/* Header / Navigation bar element */}
      <header className="sticky top-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-4 md:px-12 py-5 max-w-screen-2xl mx-auto">
          <Link 
            href="/"
            className="font-headline text-2xl font-bold tracking-tight text-primary transition-all duration-300 ease-in-out hover:opacity-80"
          >
            Serch
          </Link>
          <Link
            href="/"
            className="font-label text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors font-semibold"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Editorial Content Container */}
      <div className="max-w-4xl mx-auto px-6 py-20 md:py-32">
        <div className="border-b border-[#e3e2e3] pb-10 mb-12">
          <span className="font-label text-xs uppercase tracking-[0.2em] text-[#3366cc] font-bold mb-4 block">
            Legal & Governance
          </span>
          <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-4 text-[#1b1c1d]">
            Cookie Policy
          </h1>
          <p className="font-body text-sm uppercase tracking-widest text-[#737784]">
            Effective Date: June 29, 2026
          </p>
        </div>

        <div className="prose prose-slate max-w-none font-body text-base leading-relaxed text-[#434653] space-y-8">
          <p className="text-lg leading-relaxed text-[#1b1c1d]">
            This Cookie Policy explains how Serch (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) uses cookies and similar tracking technologies to recognize you when you visit our marketplace platform. It explains what these technologies are and why we use them, as well as your rights to control our use of them.
          </p>

          <section className="space-y-4">
            <h2 className="font-headline text-2xl font-bold text-[#1b1c1d] tracking-tight mt-10">
              1. Understanding Cookies
            </h2>
            <p>
              Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
            </p>
            <p>
              Cookies set by the website owner (in this case, Serch) are called &quot;first-party cookies&quot;. Cookies set by parties other than the website owner are called &quot;third-party cookies&quot;. Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., interactive content, analytics, and service mappings).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-headline text-2xl font-bold text-[#1b1c1d] tracking-tight mt-10">
              2. Why We Use Cookies
            </h2>
            <p>
              We use first-party and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our platform to operate, and we refer to these as &quot;essential&quot; or &quot;strictly necessary&quot; cookies. Other cookies enable us to track and target the interests of our users to enhance the experience on our online marketplace.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-headline text-2xl font-bold text-[#1b1c1d] tracking-tight mt-10">
              3. The Types of Cookies We Deploy
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left border border-[#e3e2e3] my-6">
                <thead>
                  <tr className="bg-[#efedee] text-[#1b1c1d] font-label text-xs uppercase tracking-wider">
                    <th className="p-4 border-b border-[#e3e2e3]">Category</th>
                    <th className="p-4 border-b border-[#e3e2e3]">Description</th>
                    <th className="p-4 border-b border-[#e3e2e3]">Examples & Provider</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[#e3e2e3]">
                  <tr>
                    <td className="p-4 font-semibold text-[#1b1c1d]">Essential Cookies</td>
                    <td className="p-4">These are strictly necessary to deliver services through our platform and to use some of its features, such as secure areas or map rendering.</td>
                    <td className="p-4 font-mono text-xs">Clerk Session, Supabase Auth</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-[#1b1c1d]">Performance & Analytics</td>
                    <td className="p-4">These cookies collect aggregated information that helps us understand how our marketplace is used or how effective our campaigns are.</td>
                    <td className="p-4 font-mono text-xs">Vercel Analytics</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-[#1b1c1d]">Functional Cookies</td>
                    <td className="p-4">Used to remember your preferences (e.g., language selection, map coordinates, or service filters) to customize your dashboard experience.</td>
                    <td className="p-4 font-mono text-xs">Leaflet Session, UI Theme</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-headline text-2xl font-bold text-[#1b1c1d] tracking-tight mt-10">
              4. Controlling and Customizing Cookie Settings
            </h2>
            <p>
              You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking the appropriate buttons on the cookie consent banner, or by configuring your web browser to refuse or accept cookies.
            </p>
            <p>
              If you choose to reject cookies, you may still use our website, though your access to some functionality and areas of our website may be restricted (for instance, maintaining an active provider dashboard session may not function correctly).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-headline text-2xl font-bold text-[#1b1c1d] tracking-tight mt-10">
              5. Updates to This Policy
            </h2>
            <p>
              We may update this Cookie Policy from time to time in order to reflect changes to the cookies we use or for other operational, legal, or regulatory reasons. Please re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.
            </p>
          </section>
        </div>

        <div className="mt-20 pt-10 border-t border-[#e3e2e3] flex justify-between items-center text-xs text-[#737784] font-label uppercase tracking-widest">
          <p>© 2026 Serch • Legal Department</p>
          <Link href="/" className="hover:text-primary transition-colors font-semibold">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
