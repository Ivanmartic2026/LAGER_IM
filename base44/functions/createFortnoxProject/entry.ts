import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id } = await req.json();
    
    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Fetch the order
    const order = await base44.entities.Order.get(order_id);
    
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if project already exists
    if (order.fortnox_project_number) {
      return Response.json({ 
        error: 'Order already has a Fortnox project',
        project_number: order.fortnox_project_number
      }, { status: 400 });
    }

    const accessToken = Deno.env.get('FORTNOX_ACCESS_TOKEN');
    if (!accessToken) {
      return Response.json({ error: 'FORTNOX_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    // Create project in Fortnox
    const fortnoxResponse = await fetch('https://api.fortnox.se/3/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Project: {
          Description: order.order_number,
          Status: 'ONGOING'
        }
      })
    });

    if (!fortnoxResponse.ok) {
      const errorText = await fortnoxResponse.text();
      console.error('Fortnox API error:', errorText);
      return Response.json({ 
        error: 'Failed to create Fortnox project',
        details: errorText
      }, { status: fortnoxResponse.status });
    }

    const fortnoxData = await fortnoxResponse.json();
    const projectNumber = fortnoxData.Project?.ProjectNumber;

    if (!projectNumber) {
      return Response.json({ error: 'No project number returned from Fortnox' }, { status: 500 });
    }

    // Update order with project details
    await base44.entities.Order.update(order_id, {
      fortnox_project_number: projectNumber,
      fortnox_project_name: order.order_number
    });

    return Response.json({
      success: true,
      project_number: projectNumber,
      project_name: order.order_number
    });
  } catch (error) {
    console.error('Error in createFortnoxProject:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});