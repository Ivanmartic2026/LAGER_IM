import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import ShelfLabel from "./ShelfLabel";
import { motion, AnimatePresence } from "framer-motion";

export default function PrintableLabels({ articles, onClose }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowPrint = window.open('', '', 'width=800,height=600');
    
    windowPrint.document.write(`
      <html>
        <head>
          <title>Hylletiketter</title>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .label-container {
              page-break-after: always;
              width: 50mm;
              height: 30mm;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .label-container:last-child {
              page-break-after: auto;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    windowPrint.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      windowPrint.focus();
      windowPrint.print();
      windowPrint.close();
    }, 250);
  };

  return (
    <AnimatePresence>
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
            <h2 className="text-xl font-bold text-white">Förhandsgranska etiketter</h2>
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-500"
              >
                <Printer className="w-4 h-4 mr-2" />
                Skriv ut
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

          {/* Preview */}
          <div className="bg-slate-800 rounded-xl p-6 mb-4">
            <p className="text-sm text-slate-400 mb-4">
              {articles.length} etikett{articles.length !== 1 ? 'er' : ''} redo för utskrift
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {articles.map((article) => (
                <div key={article.id} className="flex justify-center">
                  <div className="scale-150 origin-center">
                    <ShelfLabel article={article} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden print content */}
          <div ref={printRef} className="hidden">
            {articles.map((article) => (
              <div key={article.id} className="label-container">
                <ShelfLabel article={article} />
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}