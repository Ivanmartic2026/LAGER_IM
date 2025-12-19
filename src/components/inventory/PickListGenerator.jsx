import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Loader2, CheckCircle2, MapPin, 
  Package, Printer, ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PickListGenerator({ articles }) {
  const [request, setRequest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pickList, setPickList] = useState(null);

  const handleGenerate = async () => {
    if (!request.trim()) {
      toast.error("Beskriv vad som ska plockas");
      return;
    }

    setIsGenerating(true);
    try {
      // Get article data for AI
      const articleData = articles.map(a => ({
        id: a.id,
        name: a.name,
        batch_number: a.batch_number,
        shelf_address: a.shelf_address,
        stock_qty: a.stock_qty,
        category: a.category
      }));

      // Use AI to generate optimized pick list
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du är en lagerexpert. Användaren vill plocka följande:

"${request}"

Här är alla tillgängliga artiklar i lagret:
${JSON.stringify(articleData, null, 2)}

Skapa en optimerad plocklista baserat på användarens begäran. Välj rätt artiklar, optimera plockordningen baserat på hyllplatser (sortera så att närliggande hyllor plockas efter varandra), och föreslå antal för varje artikel baserat på vad som verkar rimligt.

Returnera en lista med artiklar att plocka, optimerad plockordning (baserat på hyllplats), och anledning för varje artikel.`,
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  article_id: { type: "string" },
                  quantity: { type: "number" },
                  reason: { type: "string" },
                  pick_order: { type: "number" }
                }
              }
            },
            optimization_notes: { type: "string" }
          }
        }
      });

      if (result.items && result.items.length > 0) {
        // Sort by pick order
        const sortedItems = result.items
          .sort((a, b) => a.pick_order - b.pick_order)
          .map(item => ({
            ...item,
            article: articles.find(a => a.id === item.article_id)
          }));

        setPickList({
          items: sortedItems,
          notes: result.optimization_notes,
          created_at: new Date().toISOString()
        });
        
        toast.success("Plocklista genererad!");
      } else {
        toast.error("Kunde inte skapa plocklista");
      }
    } catch (error) {
      console.error("Error generating pick list:", error);
      toast.error("Kunde inte generera plocklista");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExecute = async () => {
    if (!pickList) return;

    const confirmed = window.confirm(
      `Vill du registrera utleverans för ${pickList.items.length} artikel${pickList.items.length !== 1 ? 'ar' : ''}?`
    );
    
    if (!confirmed) return;

    try {
      for (const item of pickList.items) {
        if (item.article) {
          const newQty = Math.max(0, (item.article.stock_qty || 0) - item.quantity);
          
          await base44.entities.Article.update(item.article.id, {
            stock_qty: newQty,
            status: newQty <= 0 ? "out_of_stock" : 
                    newQty <= (item.article.min_stock_level || 5) ? "low_stock" : "active"
          });

          await base44.entities.StockMovement.create({
            article_id: item.article.id,
            movement_type: "outbound",
            quantity: -item.quantity,
            previous_qty: item.article.stock_qty,
            new_qty: newQty,
            reason: item.reason || "Plocklista",
            reference: `Plocklista: ${request.substring(0, 50)}`
          });
        }
      }

      toast.success("Utleverans registrerad!");
      setPickList(null);
      setRequest("");
    } catch (error) {
      console.error("Error executing pick list:", error);
      toast.error("Kunde inte registrera utleverans");
    }
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>AI-assisterad plocklistegenerering</span>
        </div>
        
        <Textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="Beskriv vad som ska plockas (t.ex. 'Jag behöver komponenter för en 2x3 meter LED-vägg med P2.5 moduler')..."
          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px]"
        />
        
        <Button
          onClick={handleGenerate}
          disabled={!request.trim() || isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-500"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Genererar optimal plocklista...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generera plocklista
            </>
          )}
        </Button>
      </div>

      {/* Pick List */}
      <AnimatePresence>
        {pickList && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Optimerad plocklista</h3>
              </div>
              {pickList.notes && (
                <p className="text-sm text-emerald-200">{pickList.notes}</p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2">
              {pickList.items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-400">{index + 1}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">
                          {item.article?.name || "Okänd artikel"}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {item.article?.shelf_address || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            #{item.article?.batch_number || "—"}
                          </span>
                        </div>
                        {item.reason && (
                          <p className="text-xs text-slate-400 mt-1">{item.reason}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-white">
                        {item.quantity}
                      </div>
                      <div className="text-xs text-slate-500">
                        Lager: {item.article?.stock_qty || 0}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => setPickList(null)}
                variant="outline"
                className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
              >
                Avbryt
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Skriv ut
              </Button>
              <Button
                onClick={handleExecute}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
              >
                <ListChecks className="w-4 h-4 mr-2" />
                Utför plockning
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}