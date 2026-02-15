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

    // Send email notifications + in-app notifications to mentioned users
    if (mentionedUsers && mentionedUsers.length > 0) {
      const article = await base44.entities.Article.get(articleId);
      
      for (const email of mentionedUsers) {
        if (email !== user.email) {
          // Create in-app notification
          await base44.asServiceRole.entities.Notification.create({
            user_email: email,
            type: 'article_comment',
            title: `${user.full_name} nämnde dig i en kommentar`,
            message: `På artikel: ${article?.name || 'Okänd artikel'}`,
            reference_type: 'article_comment',
            reference_id: comment.id,
            link: `/inventory?articleId=${articleId}`,
            read: false
          });
          
          // Send email
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
    }

    return Response.json({ success: true, comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});