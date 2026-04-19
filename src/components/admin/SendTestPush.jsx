import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SendTestPush({ userEmail }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSendTestPush = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('sendPushNotification', {
        user_email: userEmail,
        title: 'Test-notis från IMvision',
        message: 'Detta är en test-pushnotis. Om du ser detta fungerar integrationen!',
        type: 'test',
        priority: 'normal',
        link_page: '/'
      });

      setResult({
        success: true,
        sent: response.data.sent,
        failed: response.data.failed,
        total: response.data.total
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleSendTestPush}
        disabled={isLoading}
        className="bg-purple-600 hover:bg-purple-700 text-white w-full flex items-center gap-2"
      >
        <Send className="w-4 h-4" />
        {isLoading ? 'Skickar test-notis...' : 'Skicka test-notis'}
      </Button>

      {result && (
        <div className={`p-3 rounded-lg flex gap-3 ${
          result.success
            ? 'bg-green-900/30 border border-green-700'
            : 'bg-red-900/30 border border-red-700'
        }`}>
          {result.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            {result.success ? (
              <>
                <p className={result.success ? 'text-green-300' : 'text-red-300'}>
                  Notis skickad!
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Skickad till {result.sent} enheter, {result.failed > 0 && `${result.failed} misslyckades`}
                </p>
              </>
            ) : (
              <p className="text-red-300">{result.error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}