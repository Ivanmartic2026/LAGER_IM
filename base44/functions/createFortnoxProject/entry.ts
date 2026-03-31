import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const order_id = payload.order_id || payload.data?.order_id || payload.event?.entity_id;

    console.log(`[Step 1] Fetching order with ID: ${order_id}`);
    const order = await base44.entities.Order.get(order_id);
    
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[Step 2] Checking if fortnox_project_number already set: ${order.fortnox_project_number || 'not set'}`);
    if (order.fortnox_project_number) {
      console.log(`[Step 2] Project already exists, skipping (idempotent)`);
      return Response.json({ 
        success: true, 
        project_number: order.fortnox_project_number,
        message: 'Project already created (idempotent)'
      });
    }

    console.log(`[Step 3] Fetching FortnoxConfig to get access_token`);
    const configs = await base44.entities.FortnoxConfig.list();
    if (!configs || configs.length === 0 || !configs[0].access_token) {
      return Response.json({ error: 'FortnoxConfig not found or access_token missing' }, { status: 400 });
    }
    const accessToken = configs[0].access_token;
    console.log(`[Step 3] Access token fetched successfully`);

    console.log(`[Step 4] Building Fortnox project payload`);
    const today = new Date().toISOString().split('T')[0];
    const projectPayload = {
      Project: {
        Description: `${order.order_number} - ${order.customer_name}`,
        Status: 'ONGOING',
        StartDate: today
      }
    };

    if (order.fortnox_customer_number) {
      projectPayload.Project.ContactType = 'CUSTOMER';
      projectPayload.Project.ContactId = order.fortnox_customer_number;
      console.log(`[Step 4] Added customer contact: ${order.fortnox_customer_number}`);
    }

    console.log(`[Step 5] Posting to Fortnox API`);
    const fortnoxResponse = await fetch('https://api.fortnox.se/3/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(projectPayload)
    });

    if (!fortnoxResponse.ok) {
      const errorText = await fortnoxResponse.text();
      console.error(`[Step 5] Fortnox API error: ${fortnoxResponse.status} - ${errorText}`);
      return Response.json({ 
        error: `Fortnox API error: ${fortnoxResponse.status}`,
        details: errorText
      }, { status: fortnoxResponse.status });
    }

    const fortnoxData = await fortnoxResponse.json();
    const projectNumber = fortnoxData.Project?.ProjectNumber;
    console.log(`[Step 5] Fortnox project created: ${projectNumber}`);

    console.log(`[Step 6] Saving project number to Order entity`);
    await base44.entities.Order.update(order_id, {
      fortnox_project_number: projectNumber
    });
    console.log(`[Step 6] Order updated successfully`);

    console.log(`[Step 7] Returning success response`);
    return Response.json({ 
      success: true, 
      project_number: projectNumber
    });
  } catch (error) {
    console.error(`Error creating Fortnox project: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});