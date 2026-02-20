import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Package, Hash, Calendar, Weight } from "lucide-react";

export default function AIReviewForm({ extractedData, poItems, articles, onConfirm, onCancel }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [notes, setNotes] = useState('');

  // Match extracted data with PO items
  const matchItems = () => {
    const matches = [];
    
    if (extractedData.article_numbers && extractedData.article_numbers.length > 0) {
      extractedData.article_numbers.forEach(({ value, confidence }) => {
        // Try to match with article SKU or batch
        const article = articles.find(a => 
          a.sku?.toLowerCase().includes(value.toLowerCase()) || 
          a.batch_number?.toLowerCase().includes(value.toLowerCase())
        );
        
        if (article) {
          const poItem = poItems.find(i => i.article_id === article.id && i.status !== 'received');
          if (poItem) {
            matches.push({
              poItem,
              article,
              matchType: 'article_number',
              confidence,
              extractedValue: value
            });
          }
        }
      });
    }
    
    return matches;
  };

  const matchedItems = matchItems();

  const toggleItem = (match) => {
    const exists = selectedItems.find(s => s.poItem.id === match.poItem.id);
    if (exists) {
      setSelectedItems(selectedItems.filter(s => s.poItem.id !== match.poItem.id));
    } else {
      setSelectedItems([...selectedItems, {
        ...match,
        quantity: match.poItem.quantity_ordered - (match.poItem.quantity_received || 0)
      }]);
    }
  };

  const updateQuantity = (poItemId, quantity) => {
    setSelectedItems(selectedItems.map(s => 
      s.poItem.id === poItemId ? { ...s, quantity: parseInt(quantity) || 0 } : s
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white mb-2">Granska AI-analys</h2>
          <p className="text-sm text-slate-400">
            Välj artiklar att ta emot baserat på det inskannade dokumentet
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Extracted Data Summary */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white mb-2">Extraherad data:</h3>
            
            {extractedData.article_numbers?.length > 0 && (
              <div className="flex items-start gap-2">
                <Hash className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Artikelnummer:</p>
                  <p className="text-sm text-white font-mono">
                    {extractedData.article_numbers.map(a => a.value).join(', ')}
                  </p>
                </div>
              </div>
            )}
            
            {extractedData.batch_lot?.length > 0 && (
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Batch/Lot:</p>
                  <p className="text-sm text-white font-mono">
                    {extractedData.batch_lot.map(b => b.value).join(', ')}
                  </p>
                </div>
              </div>
            )}
            
            {extractedData.quantity?.length > 0 && (
              <div className="flex items-start gap-2">
                <Weight className="w-4 h-4 text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Kvantitet:</p>
                  <p className="text-sm text-white">
                    {extractedData.quantity.map(q => `${q.value} ${q.context || ''}`).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Matched Items */}
          {matchedItems.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Matchade artiklar ({matchedItems.length}):</h3>
              {matchedItems.map((match) => {
                const isSelected = selectedItems.find(s => s.poItem.id === match.poItem.id);
                const remaining = match.poItem.quantity_ordered - (match.poItem.quantity_received || 0);
                
                return (
                  <div
                    key={match.poItem.id}
                    onClick={() => toggleItem(match)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-green-500/10 border-green-500/50' 
                        : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${isSelected ? 'text-green-400' : 'text-slate-500'}`}>
                        {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">{match.article.name}</h4>
                        <div className="text-xs text-slate-400 space-y-1">
                          <p>SKU: <span className="text-slate-300 font-mono">{match.article.sku}</span></p>
                          <p>Beställt: {match.poItem.quantity_ordered} st · Återstår: {remaining} st</p>
                          <p className="text-green-400">
                            Match: {match.extractedValue} ({Math.round(match.confidence * 100)}% säkerhet)
                          </p>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                            <Label className="text-xs text-slate-400">Antal att ta emot:</Label>
                            <Input
                              type="number"
                              min="1"
                              max={remaining}
                              value={isSelected.quantity}
                              onChange={(e) => updateQuantity(match.poItem.id, e.target.value)}
                              className="mt-1 bg-slate-800 border-slate-600"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
              <XCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                Kunde inte matcha några artiklar automatiskt.
                <br />
                Kontrollera orderrader manuellt.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-slate-300 mb-2 block">Anteckningar (valfritt):</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lägg till anteckningar från följesedeln..."
              className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="bg-slate-800 border-slate-600 hover:bg-slate-700"
          >
            Avbryt
          </Button>
          <Button
            onClick={() => onConfirm(selectedItems, notes)}
            disabled={selectedItems.length === 0}
            className="bg-green-600 hover:bg-green-500"
          >
            Ta emot {selectedItems.length > 0 && `(${selectedItems.length})`}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}