
'use client';

import * as React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Choose a theme
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  language: string | undefined;
  code: string;
  className?: string;
}

export function CodeBlock({ language, code, className }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast({ title: 'Copied!', description: 'Code copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    }).catch(err => {
      console.error('Failed to copy code: ', err);
      toast({ title: 'Error', description: 'Failed to copy code.', variant: 'destructive' });
    });
  };

  // If no language is detected, default to 'plaintext' or similar
  const effectiveLanguage = language || 'plaintext';

  return (
    <div className={cn("relative group rounded-md bg-background border my-2", className)}>
      <SyntaxHighlighter
        language={effectiveLanguage}
        style={vscDarkPlus} // Apply the chosen theme
        customStyle={{
          margin: 0, // Remove default margin
          padding: '1rem', // Add padding
          borderRadius: '0.375rem', // Match parent rounding
          backgroundColor: 'hsl(var(--muted))', // Use muted background for code block
          fontSize: '0.875rem', // text-sm
          overflowX: 'auto', // Allow horizontal scrolling for long lines
        }}
        codeTagProps={{
            style: { // Ensure code tag doesn't inherit strange styles
                 fontFamily: 'var(--font-geist-mono), monospace',
            }
        }}
        wrapLines={true} // Optionally wrap long lines
        showLineNumbers={false} // Optionally show line numbers
      >
        {code}
      </SyntaxHighlighter>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
        aria-label="Copy code"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
      </Button>
    </div>
  );
}
