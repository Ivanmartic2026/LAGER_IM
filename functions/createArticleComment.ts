import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { articleId, content, mentionedUsers } = body;

    if (!articleId || !content) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the comment
    const comment = await base44.asServiceRole.entities.ArticleComment.create({
      article_id: articleId,
      content,
      mentioned_users: mentionedUsers || []
    });

    // Send email notifications to mentioned users
    if (mentionedUsers && mentionedUsers.length > 0) {
      for (const email of mentionedUsers) {
        try {
          await base44.integrations.Core.SendEmail({
            to: email,
            subject: `Du har blivit nämnd i en kommentar`,
            body: `${user.full_name} har nämnt dig i en kommentar:\n\n"${content}"\n\nLogga in för att se mer.`
          });
        } catch (emailError) {
          console.error('Failed to send email to', email, emailError);
        }
      }
    }

    return Response.json({ success: true, comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});