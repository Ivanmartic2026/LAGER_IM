import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { X, Download, Loader2 } from "lucide-react";
import ShelfLabel from "./ShelfLabel";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LabelDownloader({ articles, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const labelRefs = useRef([]);

  const downloadAsImage = async (index) => {
    try {
      const response = await base44.functions.invoke('generateLabelPDF', {
        articleId: articles[index].id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `etikett_${articles[index].batch_number || articles[index].id.slice(0, 8)}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Etikett nedladdad!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Kunde inte generera etikett');
    }
  };

  const downloadAll = async () => {
    setIsGenerating(true);
    
    try {
      for (let i = 0; i < articles.length; i++) {
        await downloadAsImage(i);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      toast.success(`${articles.length} etiketter nedladdade!`);
    } catch (error) {
      toast.error('Något gick fel vid nedladdning');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Ladda ner etiketter</h2>
          <div className="flex gap-2">
            <Button
              onClick={downloadAll}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Genererar...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Ladda ner alla
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 mb-4">
          <p className="text-sm text-slate-400 mb-4">
            {articles.length} etikett{articles.length !== 1 ? 'er' : ''} redo att ladda ner som PNG
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((article, index) => (
              <div key={article.id} className="space-y-3">
                <div 
                  ref={el => labelRefs.current[index] = el}
                  className="flex justify-center bg-white p-4 rounded-lg"
                >
                  <div className="scale-150 origin-center">
                    <ShelfLabel article={article} />
                  </div>
                </div>
                <Button
                  onClick={() => downloadAsImage(index)}
                  variant="outline"
                  size="sm"
                  className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                >
                  <Download className="w-3 h-3 mr-2" />
                  Ladda ner
                </Button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}