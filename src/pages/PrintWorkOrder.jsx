import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PrintToolbar from '@/components/print/PrintToolbar';
import PrintPage1 from '@/components/print/PrintPage1';
import PrintPage2 from '@/components/print/PrintPage2';

export default function PrintWorkOrder() {
  const params = new URLSearchParams(window.location.search);
  const workOrderId = params.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workOrder, setWorkOrder] = useState(null);
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [activePage, setActivePage] = useState(1);

  useEffect(() => {
    if (!workOrderId) {
      setError('Ingen arbetsorder angiven (saknar ?id=...)');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const woList = await base44.entities.WorkOrder.filter({ id: workOrderId });
        const wo = woList[0];
        if (!wo) { setError('Arbetsorder hittades inte'); setLoading(false); return; }
        setWorkOrder(wo);

        const [orderList, taskList, articleList] = await Promise.all([
          wo.order_id ? base44.entities.Order.filter({ id: wo.order_id }) : Promise.resolve([]),
          base44.entities.Task.filter({ work_order_id: workOrderId }),
          base44.entities.Article.list(),
        ]);

        const ord = orderList[0] || null;
        setOrder(ord);
        setTasks(taskList);
        setArticles(articleList);

        const extraFetches = [];
        if (ord) {
          extraFetches.push(base44.entities.OrderItem.filter({ order_id: ord.id }).then(setOrderItems));
        }
        if (wo.fortnox_project_number) {
          extraFetches.push(
            base44.entities.PurchaseOrder.filter({ fortnox_project_number: wo.fortnox_project_number })
              .then(setPurchaseOrders)
          );
        }
        await Promise.all(extraFetches);
      } catch (e) {
        setError('Fel vid hämtning: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [workOrderId]);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#c00', textAlign: 'center' }}>
        <h2>⚠️ Fel</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f5f5f5', fontFamily: 'sans-serif', color: '#555',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '4px solid #ddd', borderTopColor: '#1B3F6E',
            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px',
          }} />
          <p>Laddar arbetsorder...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  const orderNumber = workOrder?.order_number || order?.order_number || '';

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { margin: 0; padding: 0; background: #fff; }
          .print-page { 
            width: 100% !important; 
            min-height: auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .print-container { background: #fff !important; padding: 0 !important; }
          @page { 
            size: A4; 
            margin: 15mm; 
          }
        }
        @media screen {
          .print-page {
            box-shadow: 0 2px 20px rgba(0,0,0,0.15);
            margin: 24px auto;
          }
        }
      `}</style>

      <PrintToolbar
        orderNumber={orderNumber}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <div className="print-container" style={{
        background: '#e8e8e8',
        minHeight: '100vh',
        paddingBottom: 40,
      }}>
        {/* Screen: show only active page. Print: show both */}
        <div style={{ display: activePage === 1 ? 'block' : 'none' }} className="print-show-always">
          <PrintPage1
            workOrder={workOrder}
            order={order}
            orderItems={orderItems}
            articles={articles}
            tasks={tasks}
            purchaseOrders={purchaseOrders}
          />
        </div>
        <div style={{ display: activePage === 2 ? 'block' : 'none' }} className="print-show-always">
          <PrintPage2
            workOrder={workOrder}
            order={order}
            orderItems={orderItems}
            articles={articles}
          />
        </div>
      </div>

      {/* Override to show both pages when printing */}
      <style>{`
        @media print {
          .print-show-always { display: block !important; }
        }
      `}</style>
    </>
  );
}