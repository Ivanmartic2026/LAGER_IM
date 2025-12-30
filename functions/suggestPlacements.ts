import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { items, warehouseId, itemsPerShelf } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Items array required' }, { status: 400 });
    }

    // Fetch all shelves for the warehouse
    const allShelves = await base44.asServiceRole.entities.Shelf.list();
    const shelves = warehouseId 
      ? allShelves.filter(s => s.warehouse_id === warehouseId && s.is_active !== false)
      : allShelves.filter(s => s.is_active !== false);

    // Fetch all articles
    const allArticles = await base44.asServiceRole.entities.Article.list();

    // Calculate current occupancy for each shelf
    const shelvesWithCapacity = shelves.map(shelf => {
      const shelfArticles = allArticles.filter(a => a.shelf_address === shelf.shelf_code);
      
      // Calculate shelf volume in cm³
      const shelfVolume = (shelf.width_cm || 0) * (shelf.height_cm || 0) * (shelf.depth_cm || 0);
      
      // Calculate current articles volume in cm³
      const currentVolume = shelfArticles.reduce((sum, article) => {
        const articleVolume = ((article.dimensions_width_mm || 0) / 10) * 
                            ((article.dimensions_height_mm || 0) / 10) * 
                            ((article.dimensions_depth_mm || 0) / 10);
        return sum + (articleVolume * (article.stock_qty || 0));
      }, 0);
      
      const availableVolume = shelfVolume - currentVolume;
      
      return {
        ...shelf,
        shelfVolume,
        currentVolume,
        availableVolume,
        occupancyPercent: shelfVolume > 0 ? (currentVolume / shelfVolume) * 100 : 0
      };
    });

    // Calculate total items to determine how many shelves needed
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const desiredShelves = itemsPerShelf && itemsPerShelf > 0 
      ? Math.ceil(totalItems / itemsPerShelf) 
      : null;

    // Sort shelves by available volume
    // If itemsPerShelf specified, sort by largest space (distribute evenly)
    // Otherwise use best-fit strategy (pack tightly)
    const sortedShelves = shelvesWithCapacity
      .filter(s => s.shelfVolume > 0 && s.availableVolume > 0)
      .sort((a, b) => itemsPerShelf 
        ? b.availableVolume - a.availableVolume  // Largest first for even distribution
        : a.availableVolume - b.availableVolume   // Smallest first for tight packing
      );

    // Process each item and suggest placements
    const suggestions = [];
    const unplacedItems = [];

    for (const item of items) {
      const article = allArticles.find(a => a.id === item.article_id);
      
      if (!article) {
        unplacedItems.push({
          ...item,
          reason: 'Artikel ej funnen'
        });
        continue;
      }

      // Calculate article volume in cm³
      const articleVolume = ((article.dimensions_width_mm || 0) / 10) * 
                          ((article.dimensions_height_mm || 0) / 10) * 
                          ((article.dimensions_depth_mm || 0) / 10);

      if (articleVolume === 0) {
        unplacedItems.push({
          ...item,
          article,
          reason: 'Artikeln saknar dimensioner'
        });
        continue;
      }

      const totalVolumeNeeded = articleVolume * item.quantity;
      let remainingQuantity = item.quantity;
      let remainingVolume = totalVolumeNeeded;

      // Determine which shelves to use based on strategy
      let shelvesToUse = sortedShelves;
      if (desiredShelves && desiredShelves > 0) {
        // Limit to desired number of shelves for this article
        shelvesToUse = sortedShelves.slice(0, desiredShelves);
      }

      // If using distribution strategy, use itemsPerShelf as target
      let targetPerShelf = itemsPerShelf && itemsPerShelf > 0 ? itemsPerShelf : null;

      // Try to place items
      for (const shelf of shelvesToUse) {
        if (remainingQuantity === 0) break;

        // Check if article fits in shelf dimensions
        const articleFits = 
          (article.dimensions_width_mm / 10 <= shelf.width_cm || !shelf.width_cm) &&
          (article.dimensions_height_mm / 10 <= shelf.height_cm || !shelf.height_cm) &&
          (article.dimensions_depth_mm / 10 <= shelf.depth_cm || !shelf.depth_cm);

        if (!articleFits && shelf.width_cm && shelf.height_cm && shelf.depth_cm) {
          continue;
        }

        // Calculate how many can fit
        const canFitVolume = Math.floor(shelf.availableVolume / articleVolume);
        
        // If distributing, try to place target amount per shelf
        let quantityToPlace;
        if (targetPerShelf !== null) {
          quantityToPlace = Math.min(canFitVolume, remainingQuantity, targetPerShelf);
        } else {
          quantityToPlace = Math.min(canFitVolume, remainingQuantity);
        }

        if (quantityToPlace > 0) {
          const volumeUsed = quantityToPlace * articleVolume;
          
          suggestions.push({
            shelf_code: shelf.shelf_code,
            shelf_id: shelf.id,
            article_id: article.id,
            article_name: article.name,
            article_batch: article.batch_number,
            quantity: quantityToPlace,
            volumeUsed,
            shelfVolumeAfter: shelf.availableVolume - volumeUsed,
            occupancyAfter: shelf.shelfVolume > 0 
              ? ((shelf.currentVolume + volumeUsed) / shelf.shelfVolume) * 100 
              : 0
          });

          // Update available volume for this shelf
          shelf.availableVolume -= volumeUsed;
          shelf.currentVolume += volumeUsed;
          
          remainingQuantity -= quantityToPlace;
          remainingVolume -= volumeUsed;
        }
      }

      // If items couldn't be placed
      if (remainingQuantity > 0) {
        unplacedItems.push({
          ...item,
          article,
          remainingQuantity,
          reason: 'Otillräckligt utrymme i lagret'
        });
      }
    }

    return Response.json({
      success: true,
      suggestions,
      unplacedItems,
      summary: {
        totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
        placedItems: suggestions.reduce((sum, s) => sum + s.quantity, 0),
        unplacedItems: unplacedItems.reduce((sum, i) => sum + (i.remainingQuantity || i.quantity), 0),
        shelvesUsed: [...new Set(suggestions.map(s => s.shelf_code))].length
      }
    });

  } catch (error) {
    console.error('Error suggesting placements:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});