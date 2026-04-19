// This file contains handler logic extracted from ScanPage to keep it manageable
// Import and use in ScanPage

import { base44 } from "@/api/base44Client";

export async function savePendingArticle({ formData, imageUrls, extractedData, setSaving, setPendingArticle, setShowLink }) {
  setSaving(true);
  try {
    const article = await base44.entities.Article.create({
      ...formData,
      stock_qty: parseInt(formData.stock_qty) || 0,
      status: "pending_verification",
      image_urls: imageUrls,
      ai_extracted_data: extractedData,
    });

    await base44.entities.StockMovement.create({
      article_id: article.id,
      movement_type: "inbound",
      quantity: parseInt(formData.stock_qty) || 0,
      previous_qty: 0,
      new_qty: article.stock_qty,
      reason: "Registrerad utan inköp – väntande verifiering"
    });

    setPendingArticle(article);
    setShowLink(true);
    return article;
  } finally {
    setSaving(false);
  }
}

export async function linkArticleToOrder({ type, id, article }) {
  if (type === 'order') {
    await base44.entities.OrderItem.create({
      order_id: id,
      article_id: article.id,
      article_name: article.name || article.batch_number,
      article_batch_number: article.batch_number,
      quantity_ordered: article.stock_qty || 1,
      quantity_picked: 0,
      status: "pending"
    });
  } else {
    const woList = await base44.entities.WorkOrder.filter({ id });
    if (woList.length > 0) {
      const existing = woList[0].materials_needed || [];
      await base44.entities.WorkOrder.update(id, {
        materials_needed: [...existing, {
          article_id: article.id,
          article_name: article.name || article.batch_number,
          batch_number: article.batch_number,
          quantity: article.stock_qty || 1,
          in_stock: article.stock_qty || 0,
          missing: 0,
          needs_purchase: false
        }]
      });
    }
  }
}