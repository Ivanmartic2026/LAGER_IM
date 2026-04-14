import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WORKSPACE_BASE_URL = 'https://medarbetarappen-7890a865.base44.app/functions';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const order = payload.data;
    if (!order) {
      return Response.json({ success: false, error: 'Ingen order i payload' }, { status: 400 });
    }

    if (!order.fortnox_project_number) {
      return Response.json({ success: true, message: 'Ingen fortnox_project_number, hoppar över workspace-sync' });
    }

    const orderId = order.id || payload.event?.entity_id;
    const fortnoxProjectNumber = order.fortnox_project_number;
    const projectName = order.fortnox_project_name || order.order_number || order.customer_name || fortnoxProjectNumber;

    // --- Upsert ProjectLink in lager app (prevent duplicates here first) ---
    const existingLinks = await base44.asServiceRole.entities.ProjectLink.filter({
      projectNumber: fortnoxProjectNumber
    });

    let workspaceProjectId = existingLinks.length > 0 ? existingLinks[0].wsProjectId : null;

    // --- Try to find/create WorkspaceProject in the workspace app ---
    // Fetch all workspace projects and search for matching project_code
    let wsProjectId = null;
    try {
      const listRes = await fetch(`${WORKSPACE_BASE_URL}/listWorkspaceProjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const allProjects = listData.projects || [];

        // Find existing project by project_code matching fortnox_project_number
        const existing = allProjects.find(p =>
          p.project_code === fortnoxProjectNumber ||
          p.project_code === String(fortnoxProjectNumber) ||
          p.name === fortnoxProjectNumber
        );

        if (existing) {
          wsProjectId = existing.id;
          console.log('Found existing WorkspaceProject:', wsProjectId, 'for project_code:', fortnoxProjectNumber);
        } else {
          // Create new workspace project via the workspace app's function
          const createRes = await fetch(`${WORKSPACE_BASE_URL}/createWorkspaceProjectFromLager`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_code: fortnoxProjectNumber,
              name: projectName,
              customerName: order.customer_name,
              orderNumber: order.order_number,
            })
          });

          if (createRes.ok) {
            const created = await createRes.json();
            wsProjectId = created.id || created.project?.id;
            console.log('Created WorkspaceProject:', wsProjectId, 'for project:', fortnoxProjectNumber);
          } else {
            const errText = await createRes.text();
            console.warn('createWorkspaceProjectFromLager not available:', errText);
            // Fall back to just using what we already have from the link
            wsProjectId = workspaceProjectId;
          }
        }
      }
    } catch (wsError) {
      console.warn('Workspace app unreachable, skipping WS project sync:', wsError.message);
      wsProjectId = workspaceProjectId;
    }

    // Use the found/created wsProjectId, fall back to what was already linked
    const finalWsProjectId = wsProjectId || workspaceProjectId;

    // --- Upsert ProjectLink ---
    if (finalWsProjectId) {
      if (existingLinks.length > 0) {
        // Update only if wsProjectId changed
        if (existingLinks[0].wsProjectId !== finalWsProjectId) {
          await base44.asServiceRole.entities.ProjectLink.update(existingLinks[0].id, {
            wsProjectId: finalWsProjectId,
            wsProjectName: projectName,
          });
        }
      } else {
        await base44.asServiceRole.entities.ProjectLink.create({
          projectNumber: fortnoxProjectNumber,
          wsProjectId: finalWsProjectId,
          wsProjectName: projectName,
        });
      }
      console.log('ProjectLink upserted for project:', fortnoxProjectNumber);
    }

    // Update order with workspace link if not already set
    if (finalWsProjectId && orderId && !order.rm_system_id) {
      await base44.asServiceRole.entities.Order.update(orderId, {
        rm_system_id: finalWsProjectId
      });
    }

    return Response.json({ success: true, workspace_project_id: finalWsProjectId });

  } catch (error) {
    console.error('syncOrderToWorkspace error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});