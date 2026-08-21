"use client";

import { useLayoutEffect, useRef } from "react";
import type { ScrapedArticle } from "@/types/article";

type ArticleTileProps = {
  article: ScrapedArticle;
  onChange: (id: string, patch: Partial<Pick<ScrapedArticle, "title" | "content">>) => void;
};

export function ArticleTile({ article, onChange }: ArticleTileProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const title = titleRef.current;
    if (title && document.activeElement !== title) {
      title.innerText = article.title;
    }
    const content = contentRef.current;
    if (content && document.activeElement !== content) {
      content.innerText = article.content;
    }
  }, [article.id, article.title, article.content]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    let size = 12.5;
    body.style.fontSize = `${size}px`;

    const min = 6;
    while (size > min && body.scrollHeight > body.clientHeight + 1) {
      size -= 0.25;
      body.style.fontSize = `${size}px`;
    }
  }, [article.content, article.title, article.image]);

  return (
    <article className="article-tile flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-neutral-800 bg-[#fbf8f1] p-2">
      <h2
        ref={titleRef}
        contentEditable
        suppressContentEditableWarning
        className="mb-1 shrink-0 cursor-text font-serif text-[1.15em] leading-tight font-bold outline-none ring-neutral-400 focus:ring-1"
        onBlur={(event) =>
          onChange(article.id, { title: event.currentTarget.innerText.trim() })
        }
      >
        {article.title}
      </h2>
      <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {article.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt=""
            className="mb-1.5 max-h-[28%] w-full shrink-0 object-cover object-center"
          />
        ) : null}
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-0 flex-1 cursor-text overflow-hidden whitespace-pre-wrap font-serif leading-[1.35] break-keep text-neutral-800 outline-none ring-neutral-400 focus:ring-1"
          onBlur={(event) =>
            onChange(article.id, { content: event.currentTarget.innerText })
          }
        >
          {article.content}
        </div>
      </div>
    </article>
  );
}
