import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all article comments from the last 7 days that have mentioned users
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const allComments = await base44.asServiceRole.entities.ArticleComment.list('-created_date', 1000);
    const recentComments = allComments.filter(c => 
      c.mentioned_users?.length > 0 && 
      new Date(c.created_date) > sevenDaysAgo
    );
    
    // For each comment, check if mentioned users have replied
    const remindersData = [];
    
    for (const comment of recentComments) {
      const article = await base44.asServiceRole.entities.Article.get(comment.article_id);
      if (!article) continue;
      
      // Get all comments on this article after this comment
      const laterComments = allComments.filter(c => 
        c.article_id === comment.article_id && 
        new Date(c.created_date) > new Date(comment.created_date)
      );
      
      // Check which mentioned users haven't replied
      for (const mentionedEmail of comment.mentioned_users) {
        const hasReplied = laterComments.some(c => c.created_by === mentionedEmail);
        
        if (!hasReplied) {
          // Check last notification sent
          const notifications = await base44.asServiceRole.entities.Notification.filter({
            user_email: mentionedEmail,
            reference_type: 'article_comment',
            reference_id: comment.id
          }, '-created_date', 10);
          
          const lastNotification = notifications[0];
          const shouldRemind = !lastNotification || 
            (new Date() - new Date(lastNotification.created_date)) > (55 * 60 * 1000); // 55 min
          
          if (shouldRemind) {
            remindersData.push({
              email: mentionedEmail,
              comment: comment,
              article: article
            });
          }
        }
      }
    }
    
    // Send reminders
    let remindersSent = 0;
    for (const data of remindersData) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: data.email,
        type: 'comment_reminder',
        title: `Påminnelse: Kommentar på ${data.article.name}`,
        message: `Du har blivit @-nämnd i en kommentar som väntar på svar`,
        reference_type: 'article_comment',
        reference_id: data.comment.id,
        link: `/inventory?articleId=${data.article.id}`,
        read: false
      });
      remindersSent++;
    }
    
    return Response.json({ 
      success: true,
      reminders_sent: remindersSent,
      comments_checked: recentComments.length
    });
    
  } catch (error) {
    console.error('Error sending comment reminders:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});