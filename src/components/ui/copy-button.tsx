
'use client';

import * as React from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  textToCopy: string;
  className?: string;
}

export function CopyButton({ textToCopy, className, variant = "ghost", size = "icon", ...props }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent triggering parent onClick events if any
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      toast({ title: 'Copied!', description: 'Message copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({ title: 'Error', description: 'Failed to copy message.', variant: 'destructive' });
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("h-6 w-6", className)} // Smaller size for inline button
      onClick={handleCopy}
      aria-label="Copy message"
      {...props}
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </Button>
  );
}
