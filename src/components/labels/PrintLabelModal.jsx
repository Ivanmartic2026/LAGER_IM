import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import ShelfLabel from './ShelfLabel';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PrintLabelModal({ article, isOpen, onClose }) {
  const labelRef = useRef(null);

  const handlePrint = async () => {
    // Create a temporary container for print
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    document.body.appendChild(printContainer);

    // Render the print version
    const printLabel = document.createElement('div');
    printContainer.appendChild(printLabel);
    
    const root = await import('react-dom/client').then(m => m.createRoot(printLabel));
    root.render(<ShelfLabel article={article} forPrint={true} />);

    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate PDF
    const canvas = await html2canvas(printLabel.querySelector('.print-label'), {
      scale: 3,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Create PDF with exact label size (30x50mm)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [30, 50]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 50, 30);
    pdf.save(`etikett-${article.batch_number}.pdf`);

    // Cleanup
    root.unmount();
    document.body.removeChild(printContainer);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Skriv ut hylletikett</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Preview */}
              <div className="mb-6 flex items-center justify-center p-6 bg-slate-800/50 rounded-xl">
                <div ref={labelRef}>
                  <ShelfLabel article={article} forPrint={false} />
                </div>
              </div>

              {/* Info */}
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-sm text-blue-200">
                  Etiketten är 30×50 mm och innehåller en QR-kod som länkar direkt till artikelinformationen i appen.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handlePrint}
                  className="flex-1 bg-blue-600 hover:bg-blue-500"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Skapa PDF
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}