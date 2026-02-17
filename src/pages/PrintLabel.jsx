import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

const urlParams = new URLSearchParams(window.location.search);
const articleId = urlParams.get('articleId');

export default function PrintLabel() {
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const loadArticle = async () => {
      try {
        if (!articleId) {
          toast.error('Ingen artikel vald');
          navigate(-1);
          return;
        }

        const articles = await base44.entities.Article.filter({ id: articleId });
        if (articles.length > 0) {
          setArticle(articles[0]);
        } else {
          toast.error('Artikel hittades inte');
          navigate(-1);
        }
      } catch (error) {
        console.error('Error loading article:', error);
        toast.error('Kunde inte ladda artikel');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [articleId, navigate]);

  const handlePrint = async () => {
    try {
      setLoading(true);
      const response = await base44.functions.invoke('getLabelHTML', { 
        articleId: article.id 
      });
      
      const printWindow = window.open('', '', 'width=400,height=300');
      if (!printWindow) {
        toast.error('Kunde inte öppna popup. Kontrollera popup-blockerare.');
        return;
      }
      
      printWindow.document.write(response.data);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 250);
      
      toast.success('Etikett öppnad för utskrift');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Kunde inte öppna etiketten');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Artikeln hittades inte</p>
          <Button onClick={() => navigate(-1)} variant="outline">Tillbaka</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-white">Skriv ut etikett</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-8 space-y-6"
        >
          {/* Article Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">{article.name}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400">Batchnummer</p>
                <p className="font-mono text-lg text-white mt-1">{article.batch_number || 'N/A'}</p>
              </div>
              
              {article.shelf_address && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400">Hyllplats</p>
                  <p className="font-mono text-lg text-white mt-1">{article.shelf_address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white p-8 rounded-xl flex justify-center items-center min-h-[300px]">
            <iframe
              title="Etikett förhandsvisning"
              srcDoc={htmlContent}
              style={{
                width: '302px',
                height: '227px',
                border: 'none',
                borderRadius: '8px'
              }}
            />
          </div>

          {/* Print Button */}
          <Button
            onClick={handlePrint}
            disabled={loading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white text-lg font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Laddar...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5 mr-2" />
                Skriv ut etikett
              </>
            )}
          </Button>

          <p className="text-sm text-slate-400 text-center">
            Etikettens storlek: 80×60mm (302×227 pixlar)
          </p>
        </motion.div>
      </div>
    </div>
  );
}