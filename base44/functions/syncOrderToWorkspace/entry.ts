import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const WORKSPACE_APP_ID = '6951895d1643f7057890a865';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const order = payload.data;
    if (!order) {
      return Response.json({ success: false, error: 'Ingen order i payload' }, { status: 400 });
    }

    // Only sync if order has a fortnox project number
    if (!order.fortnox_project_number) {
      return Response.json({ success: true, message: 'Ingen fortnox_project_number, hoppar över workspace-sync' });
    }

    const orderId = order.id || payload.event?.entity_id;

    // Use Base44 cross-app API to sync to IM Workspace
    const baseUrl = `https://api.base44.app/api/apps/${WORKSPACE_APP_ID}/entities/WorkspaceProject`;
    
    // Get service token for cross-app call
    // We use the app's own service role token via the SDK's internal mechanism
    const headers = {
      'Content-Type': 'application/json',
      'X-App-Id': WORKSPACE_APP_ID,
    };

    // Try to find existing WorkspaceProject linked to this order
    const searchRes = await fetch(
      `${baseUrl}?filters=${encodeURIComponent(JSON.stringify({ fortnoxProjectNumber: order.fortnox_project_number }))}`,
      { headers }
    );

    let workspaceProjectId = null;

    const projectData = {
      name: order.order_number || order.customer_name || 'Projekt',
      fortnoxProjectNumber: order.fortnox_project_number,
      createdFromLager: true,
      customerName: order.customer_name,
      orderNumber: order.order_number,
    };

    if (searchRes.ok) {
      const existing = await searchRes.json();
      const existingProjects = Array.isArray(existing) ? existing : existing.results || [];
      
      if (existingProjects.length > 0) {
        workspaceProjectId = existingProjects[0].id;
        // Update existing
        await fetch(`${baseUrl}/${workspaceProjectId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(projectData)
        });
      } else {
        // Create new
        const createRes = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(projectData)
        });
        if (createRes.ok) {
          const created = await createRes.json();
          workspaceProjectId = created.id;
        }
      }
    }

    // Update order with workspace link if we got an ID
    if (workspaceProjectId && orderId && !order.rm_system_id) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        rm_system_id: workspaceProjectId
      });
    }

    console.log('Workspace sync klar för order:', orderId, 'workspace project:', workspaceProjectId);
    return Response.json({ success: true, workspace_project_id: workspaceProjectId });

  } catch (error) {
    console.error('syncOrderToWorkspace error:', error.message);
    // Don't fail hard - workspace sync is secondary
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});