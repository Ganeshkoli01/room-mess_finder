import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getStaticPageBySlug, StaticPage as CMSPage } from "@/services/settingsService";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const parseMarkdown = (markdown: string): string => {
  if (!markdown) return "";
  
  // Convert Markdown headings
  let html = markdown
    .replace(/^#\s+(.+)$/gm, '<h1 class="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-6 pb-2 border-b">$1</h1>')
    .replace(/^##\s+(.+)$/gm, '<h2 class="font-heading font-semibold text-2xl text-foreground mt-8 mb-4">$1</h2>')
    .replace(/^###\s+(.+)$/gm, '<h3 class="font-heading font-medium text-xl text-foreground mt-6 mb-3">$1</h3>');
  
  // Bold text
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // List items
  html = html.replace(/^\-\s+(.+)$/gm, '<li class="ml-6 list-disc text-muted-foreground my-1.5">$1</li>');
  
  // Convert single line breaks to br tags (ignoring double ones that separate lists/headers)
  html = html.split('\n').join('<br />');
  
  return html;
};

const StaticPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const data = await getStaticPageBySlug(slug);
        setPage(data);
      } catch (err) {
        console.error("Error loading CMS page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl mt-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 group transition-colors">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading page content...</p>
          </div>
        ) : page ? (
          <article className="bg-card border rounded-3xl p-6 sm:p-10 shadow-sm leading-relaxed">
            <div 
              className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(page.content) }}
            />
          </article>
        ) : (
          <div className="text-center py-20 border rounded-3xl bg-card">
            <h2 className="text-2xl font-bold font-heading mb-2">Page Not Found</h2>
            <p className="text-muted-foreground mb-6">The requested information page does not exist or has been removed.</p>
            <Button asChild>
              <Link to="/">Go Back Home</Link>
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default StaticPage;
