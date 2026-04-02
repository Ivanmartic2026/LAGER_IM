import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, FileText, Code, Users } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const USER_MANUAL = `# IMvision Lager & Order - Användarmanual

Denna manual beskriver hur du använder systemet för daglig drift. Systemet hanterar lager, ordrar, inköp och reparationer för LED-skärmar och komponenter.

## Snabbstart

1. Logga in med ditt konto
2. Installera som PWA-app på din enhet (rekommenderas)
3. Navigera via menyn längst ner

## Viktiga sidor

- **Inventory** – Se och hantera alla artiklar i lager
- **Orders** – Hantera kundordrar och plockning
- **PurchaseOrders** – Skapa och följa upp inköp
- **WorkOrders** – Arbetsordrar för produktion och montering
- **Scan** – Kameran för AI-skanning av etiketter
- **Repairs** – Artiklar på reparation
- **Admin** – Användarhantering, rapporter, inställningar

## Vanliga arbetsflöden

### Inleverans via skanning
1. Gå till **Scan** → välj **Inleverans**
2. Fotografera etiketten
3. AI extraherar data automatiskt
4. Granska och spara

### Plocka en order
1. Gå till **Orders**
2. Välj order → **Börja plocka**
3. Följ listan med hyllplatser
4. Slutför plockning → lagersaldo uppdateras

### Ta emot inköpsorder
1. Öppna inköpsordern → **Ta emot varor**
2. Ange mottagen kvantitet per rad
3. Välj hyllplats
4. Slutför mottagning

## Tips
- Använd PWA-läget för offline-stöd och snabbare åtkomst
- Skanna regelbundet för korrekta lagersaldon
- Håll hyllplatser uppdaterade för enklare plockning
`;

const SYSTEM_DOC = `# IMvision – Systemdokumentation

## Systemöversikt

IMvision är ett komplett lager- och orderhanteringssystem för LED-skärmar och komponenter byggt på Base44-plattformen.

## Nyckelentiteter

- **Article** – Alla lagerartiklar med saldo, hyllplats och metadata
- **StockMovement** – Alla lagertransaktioner (in/ut/justering)
- **Order / OrderItem** – Kundordrar och orderrader
- **PurchaseOrder / PurchaseOrderItem** – Inköpsordrar
- **WorkOrder** – Arbetsordrar för produktion
- **ReceivingRecord** – Mottagningskvitton
- **RepairLog** – Reparationshistorik
- **Supplier / Warehouse / Shelf** – Stöddata

## Backend-funktioner

Alla känsliga operationer körs som Deno-funktioner:
- Export till Excel/PDF
- AI-analys av etiketter
- E-postutskick
- Fortnox-synkronisering
- Etikettgenerering

## Integrationer

- **InvokeLLM** – AI-analys och datafyllning
- **UploadFile** – Fillagring
- **SendEmail** – E-postnotifieringar
- **Fortnox** – Fakturasynkronisering

## Säkerhet

- Autentisering via Base44
- Roller: **admin** (full åtkomst) och **user** (begränsad)
- Leverantörsportalen använder token-baserad åtkomst utan inloggning
`;

export default function DocumentationPage() {
  const [activeDoc, setActiveDoc] = useState('user');

  const docs = {
    user: {
      title: "Användarmanual",
      icon: Users,
      content: USER_MANUAL,
      description: "Komplett guide för daglig användning av systemet"
    },
    system: {
      title: "Systemdokumentation",
      icon: FileText,
      content: SYSTEM_DOC,
      description: "Teknisk dokumentation och systemöversikt"
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Dokumentation</h1>
              <p className="text-slate-400">Guider och teknisk information</p>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeDoc} onValueChange={setActiveDoc} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1">
            {Object.entries(docs).map(([key, doc]) => {
              const Icon = doc.icon;
              return (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="hidden md:inline">{doc.title}</span>
                  <span className="md:hidden">{doc.title.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(docs).map(([key, doc]) => (
            <TabsContent key={key} value={key}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                  <h2 className="text-xl font-semibold text-white mb-1">{doc.title}</h2>
                  <p className="text-slate-400 text-sm">{doc.description}</p>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                  <DocumentationViewer content={doc.content} />
                </div>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function DocumentationViewer({ content }) {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-white mb-4 mt-8 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold text-white mb-3 mt-6 border-b border-white/10 pb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-white mb-2 mt-4">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-slate-300 mb-4 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-300">{children}</li>
          ),
          code: ({ inline, children }) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-white/10 text-purple-400 text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto mb-4 border border-white/10">
                <code className="text-sm text-slate-300 font-mono">{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-500/50 pl-4 py-2 mb-4 text-slate-400 italic">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-white/10 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/5">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/10">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/5 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-white font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-slate-300">{children}</td>
          ),
          hr: () => (
            <hr className="border-white/10 my-6" />
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-300">{children}</em>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}