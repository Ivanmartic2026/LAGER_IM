import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Copy, Check, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmailOrderSetupPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    
    // Get webhook URL
    const appUrl = window.location.origin;
    const url = `${appUrl}/api/functions/processIncomingOrderEmail`;
    setWebhookUrl(url);
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Kopierad till urklipp');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Endast för administratörer</h2>
          <p className="text-slate-400 mb-4">Du behöver administratörsrättigheter för att komma åt denna sida.</p>
          <Link to={createPageUrl("Home")}>
            <Button>Tillbaka till startsidan</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-6">
          <Link to={createPageUrl("Admin")}>
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 -ml-2 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
            E-post till Order
          </h1>
          <p className="text-white/50">Konfigurera e-post integration för att automatiskt skapa ordrar</p>
        </div>

        {/* How it works */}
        <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/30 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Mail className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Hur det fungerar</h2>
              <div className="space-y-2 text-sm text-blue-200">
                <p>1. Konfigurera en e-posttjänst (Mailgun, SendGrid, etc.) att vidarebefordra inkommande e-post till webhook-URLen nedan</p>
                <p>2. Kunder skickar ordrar via e-post till din dedikerade e-postadress</p>
                <p>3. Systemet använder AI för att automatiskt extrahera orderinformation från e-posten och eventuella PDF-bilagor</p>
                <p>4. En order skapas automatiskt i systemet med status "Redo att plocka"</p>
                <p>5. Artiklar matchas automatiskt mot lagret baserat på artikelnummer eller namn</p>
                <p>6. Bekräftelse skickas tillbaka till kunden och administratörer notifieras</p>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Webhook URL</h2>
          <p className="text-sm text-slate-400 mb-4">
            Kopiera denna URL och konfigurera din e-posttjänst att vidarebefordra inkommande e-post hit:
          </p>
          
          <div className="flex gap-2 mb-4">
            <Input
              value={webhookUrl}
              readOnly
              className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
            />
            <Button
              onClick={() => copyToClipboard(webhookUrl)}
              variant="outline"
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-200">
              <strong>Säkerhet:</strong> För att aktivera webhook-säkerhet, sätt en miljövariabel <code className="bg-black/30 px-2 py-1 rounded">EMAIL_WEBHOOK_SECRET</code> i dina inställningar. Skicka sedan samma secret som en header <code className="bg-black/30 px-2 py-1 rounded">X-Webhook-Secret</code> eller query parameter <code className="bg-black/30 px-2 py-1 rounded">?secret=DIN_SECRET</code> när du konfigurerar e-posttjänsten.
            </p>
          </div>
        </div>

        {/* Supported Email Services */}
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">E-posttjänster som stöds</h2>
          <p className="text-sm text-slate-400 mb-4">
            Alla e-posttjänster som kan vidarebefordra inkommande e-post via webhook stöds. Här är några populära alternativ:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                Mailgun
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </h3>
              <p className="text-sm text-slate-400 mb-2">Konfigurera "Routes" att vidarebefordra till webhook URL</p>
              <a 
                href="https://documentation.mailgun.com/en/latest/user_manual.html#routes" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Se dokumentation →
              </a>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                SendGrid
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </h3>
              <p className="text-sm text-slate-400 mb-2">Använd "Inbound Parse Webhook" för att vidarebefordra e-post</p>
              <a 
                href="https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Se dokumentation →
              </a>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                Postmark
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </h3>
              <p className="text-sm text-slate-400 mb-2">Konfigurera "Inbound Webhooks" för din domän</p>
              <a 
                href="https://postmarkapp.com/developer/webhooks/inbound-webhook" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Se dokumentation →
              </a>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h3 className="font-semibold text-white mb-2">Annan tjänst</h3>
              <p className="text-sm text-slate-400">
                Vilken tjänst som helst som kan skicka e-postdata som JSON till en webhook-URL
              </p>
            </div>
          </div>
        </div>

        {/* Expected format */}
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Förväntat e-postformat</h2>
          <p className="text-sm text-slate-400 mb-4">
            Systemet kan hantera e-post i både fri textform och strukturerade format. AI:n extraherar automatiskt relevant information:
          </p>
          
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-slate-300 mb-4">
            <div className="text-slate-500 mb-2">Exempel e-post:</div>
            <div className="space-y-1">
              <div>Till: orders@minbutik.se</div>
              <div>Från: kund@foretag.se</div>
              <div>Ämne: Beställning LED-moduler</div>
              <div className="mt-2">---</div>
              <div className="mt-2">Hej,</div>
              <div className="mt-2">Jag vill beställa följande:</div>
              <div className="mt-2">- 50 st P2.6 Indoor moduler (Batch: IM-2024-001)</div>
              <div>- 30 st P3.9 Outdoor moduler (Batch: IM-2024-015)</div>
              <div>- 10 st Strömförsörjningar 500W</div>
              <div className="mt-2">Leverans: 2026-01-15</div>
              <div>Adress: Industrivägen 10, Stockholm</div>
              <div className="mt-2">Referensnummer: ORD-2026-123</div>
            </div>
          </div>

          <p className="text-sm text-slate-400">
            Systemet matchar automatiskt artiklar baserat på batch-nummer, artikelnummer eller produktnamn. PDF-bilagor analyseras också för orderinformation.
          </p>
        </div>
      </div>
    </div>
  );
}