import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get Fortnox token from FortnoxConfig
    const configs = await base44.asServiceRole.entities.FortnoxConfig.list();
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'Fortnox not configured' }, { status: 500 });
    }
    
    const config = configs[0];
    let accessToken = config.access_token;
    
    // Check if token needs refresh
    const now = Date.now();
    if (config.token_expires_at && config.token_expires_at < now) {
      // Refresh the token
      const refreshResponse = await fetch('https://api.fortnox.se/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: config.refresh_token,
          client_id: Deno.env.get('FORTNOX_CLIENT_ID') || '',
          client_secret: Deno.env.get('FORTNOX_CLIENT_SECRET') || '',
        }).toString(),
      });
      
      if (refreshResponse.ok) {
        const tokenData = await refreshResponse.json();
        accessToken = tokenData.access_token;
        
        // Update config with new token
        await base44.asServiceRole.entities.FortnoxConfig.update(config.id, {
          access_token: tokenData.access_token,
          token_expires_at: Date.now() + (tokenData.expires_in * 1000),
        });
      }
    }
    
    // Fetch projects from Fortnox
    const projectsResponse = await fetch('https://api.fortnox.se/3/projects?limit=500', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!projectsResponse.ok) {
      return Response.json({ error: 'Failed to fetch projects from Fortnox' }, { status: 500 });
    }
    
    const data = await projectsResponse.json();
    
    // Map and return projects
    const projects = (data.Projects || []).map((project: any) => ({
      projectNumber: project.ProjectNumber,
      description: project.Description,
      status: project.Status,
      startDate: project.StartDate,
      endDate: project.EndDate,
    }));
    
    return Response.json({ projects });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});