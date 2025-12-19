import React from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function ReportPreview({ report, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{report.title}</h2>
            <p className="text-sm text-slate-500">
              Genererad: {new Date(report.generated_at).toLocaleString('sv-SE')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div
          className="p-6"
          dangerouslySetInnerHTML={{ __html: report.content }}
        />
      </motion.div>
    </motion.div>
  );
}