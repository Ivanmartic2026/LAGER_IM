import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filterInvoiced } = await req.json().catch(() => ({}));

    // Hämta alla ordrar
    let orders = await base44.asServiceRole.entities.Order.list('-created_date');

    // Filtrera på fakturerade om angivet
    if (filterInvoiced === 'invoiced') {
      orders = orders.filter(o => o.fortnox_invoiced === true);
    } else if (filterInvoiced === 'not_invoiced') {
      orders = orders.filter(o => o.status === 'picked' && !o.fortnox_invoiced);
    }

    // Hämta alla orderitems
    const orderItems = await base44.asServiceRole.entities.OrderItem.list();

    // Bygg data för Excel
    const excelData = orders.map(order => {
      const items = orderItems.filter(item => item.order_id === order.id);
      const totalOrdered = items.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0);
      const totalPicked = items.reduce((sum, item) => sum + (item.quantity_picked || 0), 0);

      const statusLabels = {
        draft: "Utkast",
        ready_to_pick: "Redo att plocka",
        picking: "Plockar",
        picked: "Plockad",
        delivered: "Levererad",
        cancelled: "Avbruten"
      };

      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toLocaleDateString('sv-SE');
        } catch {
          return '';
        }
      };

      const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toLocaleString('sv-SE');
        } catch {
          return '';
        }
      };

      const cleanString = (str) => {
        if (!str) return '';
        return String(str).replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      };

      return {
        'Ordernummer': cleanString(order.order_number || `#${order.id.slice(0, 8)}`),
        'Kund': cleanString(order.customer_name),
        'Status': statusLabels[order.status] || order.status || '',
        'Antal artiklar': items.length,
        'Totalt beställt': totalOrdered,
        'Totalt plockat': totalPicked,
        'Leveransdatum': formatDate(order.delivery_date),
        'Leveransadress': cleanString(order.delivery_address),
        'Fakturerad': order.fortnox_invoiced ? 'Ja' : 'Nej',
        'Fakturanummer': cleanString(order.fortnox_invoice_number),
        'Fakturerad datum': formatDateTime(order.invoiced_date),
        'Fakturerad av': cleanString(order.invoiced_by),
        'Plockad av': cleanString(order.picked_by),
        'Plockad datum': formatDateTime(order.picked_date),
        'Skapad': formatDateTime(order.created_date),
        'Skapad av': cleanString(order.created_by),
        'Anteckningar': cleanString(order.notes)
      };
    });

    // Skapa workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Sätt kolumnbredder
    worksheet['!cols'] = [
      { wch: 15 }, // Ordernummer
      { wch: 25 }, // Kund
      { wch: 15 }, // Status
      { wch: 12 }, // Antal artiklar
      { wch: 12 }, // Totalt beställt
      { wch: 12 }, // Totalt plockat
      { wch: 12 }, // Leveransdatum
      { wch: 30 }, // Leveransadress
      { wch: 10 }, // Fakturerad
      { wch: 15 }, // Fakturanummer
      { wch: 18 }, // Fakturerad datum
      { wch: 25 }, // Fakturerad av
      { wch: 25 }, // Plockad av
      { wch: 18 }, // Plockad datum
      { wch: 18 }, // Skapad
      { wch: 25 }, // Skapad av
      { wch: 40 }  // Anteckningar
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordrar');

    // Konvertera till buffer med array
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=ordrar_${new Date().toISOString().split('T')[0]}.xlsx`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});