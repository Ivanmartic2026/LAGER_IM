import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, X, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function InternalTransferModal({ isOpen, onClose, article, siblingArticles }) {
  const [quantity, setQuantity] = useState('');
  const [targetArticleId, setTargetArticleId] = useState('');
  const queryClient = useQueryClient();

  const transferMutation = useMutation({
    mutationFn: async ({ qty, targetId }) => {
      const target = siblingArticles.find(a => a.id === targetId);
      if (!target) throw new Error('Mållager ej hittat');
      if (qty > (article.stock_qty || 0)) throw new Error('Inte tillräckligt med lager');

      const newSourceQty = (article.stock_qty || 0) - qty;
      const newTargetQty = (target.stock_qty || 0) + qty;

      // Update source article
      await base44.entities.Article.update(article.id, { stock_qty: newSourceQty });
      // Update target article
      await base44.entities.Article.update(targetId, { stock_qty: newTargetQty });

      // Log movement on source
      await base44.entities.StockMovement.create({
        article_id: article.id,
        movement_type: 'adjustment',
        quantity: -qty,
        previous_qty: article.stock_qty || 0,
        new_qty: newSourceQty,
        reason: `🔄 Intern flytt: ${qty} st flyttades till ${target.warehouse || 'Okänt lager'}`
      });

      // Log movement on target
      await base44.entities.StockMovement.create({
        article_id: targetId,
        movement_type: 'adjustment',
        quantity: qty,
        previous_qty: target.stock_qty || 0,
        new_qty: newTargetQty,
        reason: `🔄 Intern flytt: ${qty} st mottaget från ${article.warehouse || 'Okänt lager'}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['sibling-articles', article.sku] });
      queryClient.invalidateQueries({ queryKey: ['article-movements', article.id] });
      toast.success('Intern flytt genomförd!');
      onClose();
      setQuantity('');
      setTargetArticleId('');
    },
    onError: (err) => {
      toast.error(err.message || 'Kunde inte genomföra flytt');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return toast.error('Ange ett giltigt antal');
    if (!targetArticleId) return toast.error('Välj ett mållager');
    transferMutation.mutate({ qty, targetId: targetArticleId });
  };

  const selectedTarget = siblingArticles.find(a => a.id === targetArticleId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-6 z-10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Intern Flytt</h2>
                  <p className="text-xs text-slate-400">Flytta lager mellan lagerställen</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* From */}
            <div className="mb-4 p-3 rounded-xl bg-slate-800 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Från</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-slate-400" />
                  <span className="text-white font-medium">{article.warehouse || 'Okänt lager'}</span>
                </div>
                <span className="text-slate-400 text-sm">{article.stock_qty || 0} st tillgängliga</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target warehouse */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Till lager</label>
                <div className="space-y-2">
                  {siblingArticles.map(sibling => (
                    <button
                      key={sibling.id}
                      type="button"
                      onClick={() => setTargetArticleId(sibling.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                        targetArticleId === sibling.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Warehouse className={`w-4 h-4 ${targetArticleId === sibling.id ? 'text-violet-400' : 'text-slate-400'}`} />
                        <span className={`font-medium ${targetArticleId === sibling.id ? 'text-violet-300' : 'text-white'}`}>
                          {sibling.warehouse || 'Okänt lager'}
                        </span>
                      </div>
                      <span className="text-slate-400 text-sm">{sibling.stock_qty || 0} st</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Antal att flytta</label>
                <Input
                  type="number"
                  min="1"
                  max={article.stock_qty || 0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="t.ex. 10"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* Preview */}
              {quantity && targetArticleId && selectedTarget && parseInt(quantity) > 0 && (
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-sm space-y-1">
                  <p className="text-violet-300 font-medium mb-2">🔄 Förhandsgranskning</p>
                  <div className="flex justify-between text-slate-300">
                    <span>{article.warehouse || 'Okänt lager'}</span>
                    <span>{article.stock_qty || 0} → <span className="text-white font-bold">{(article.stock_qty || 0) - parseInt(quantity)} st</span></span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{selectedTarget.warehouse || 'Okänt lager'}</span>
                    <span>{selectedTarget.stock_qty || 0} → <span className="text-white font-bold">{(selectedTarget.stock_qty || 0) + parseInt(quantity)} st</span></span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-slate-700 text-slate-300">
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  disabled={transferMutation.isPending || !quantity || !targetArticleId}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
                >
                  {transferMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Flytta
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}