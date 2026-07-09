"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { defaultHomeQuote, homeQuotes, type HomeQuote } from "@/lib/quotes";

function randomQuote(current?: HomeQuote): HomeQuote {
  if (!homeQuotes.length) return defaultHomeQuote;
  if (homeQuotes.length === 1) return homeQuotes[0];

  const alternatives = current
    ? homeQuotes.filter((quote) => quote !== current)
    : homeQuotes;

  return alternatives[Math.floor(Math.random() * alternatives.length)] || defaultHomeQuote;
}

export function HomeQuoteRotator() {
  const [quote, setQuote] = useState<HomeQuote>(defaultHomeQuote);
  const shuffle = useCallback(() => setQuote((current) => randomQuote(current)), []);

  useEffect(() => {
    shuffle();
  }, [shuffle]);

  return <div>
    <div className="flex items-start gap-2">
      <h1 lang={quote.language} className="mt-1 text-3xl font-bold tracking-tight">
        {quote.text}
      </h1>
      <button
        type="button"
        onClick={shuffle}
        title="New quote"
        aria-label="Show a new quote"
        className="mt-2 shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-moss"
      >
        <RefreshCw size={15} />
      </button>
    </div>
    {quote.author && <p className="mt-1 text-xs text-slate-400">— {quote.author}</p>}
  </div>;
}
