import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, Download, FileText, Code, Users } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export default function DocumentationPage() {
  const [activeDoc, setActiveDoc] = useState('user');

  const docs = {
    user: {
      title: "Användarmanual",
      icon: Users,
      file: "Anvandarmanual.md",
      description: "Komplett guide för daglig användning av systemet"
    },
    system: {
      title: "Systemdokumentation",
      icon: FileText,
      file: "SystemDokumentation.md",
      description: "Teknisk dokumentation och systemöversikt"
    },
    agent: {
      title: "AI Agent Guide",
      icon: Code,
      file: "Base44AgentDokumentation.md",
      description: "Hur Base44 AI-agenten arbetar och bygger system"
    }
  };

  const handleDownload = async (filename) => {
    try {
      const response = await fetch(`/docs/${filename}`);
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download error:', error);
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
                <div className="flex items-start justify-between gap-4 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">{doc.title}</h2>
                    <p className="text-slate-400">{doc.description}</p>
                  </div>
                  <Button
                    onClick={() => handleDownload(doc.file)}
                    variant="outline"
                    className="bg-white/5 border-white/20 hover:bg-white/10 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Ladda ner
                  </Button>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                  <DocumentationViewer filename={doc.file} />
                </div>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function DocumentationViewer({ filename }) {
  const [content, setContent] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadDoc = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/docs/${filename}`);
        const text = await response.text();
        setContent(text);
      } catch (error) {
        setContent(`# Fel vid laddning\n\nKunde inte ladda dokumentationen. Kontrollera att filen finns.\n\nFel: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
  }, [filename]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

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