"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function MessageBubble({
  role,
  content,
  streaming = false,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard diblokir browser — diamkan saja, bukan kesalahan yang perlu
      // ditampilkan ke user.
    }
  }

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-orange-500 text-white"
            : "border border-zinc-800 bg-zinc-900 text-zinc-100"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <>
            <div className="prose-chat space-y-3 [&_a]:text-orange-400 [&_a]:underline [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_li]:ml-4 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-950 [&_pre]:p-3 [&_ul]:list-disc">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
            {!streaming && content.trim().length > 0 && (
              <button
                onClick={handleCopy}
                className="mt-2 text-xs text-zinc-500 opacity-0 transition-opacity hover:text-zinc-300 focus:opacity-100 group-hover:opacity-100"
              >
                {copied ? "Tersalin" : "Salin"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
