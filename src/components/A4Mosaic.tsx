"use client";

import { useMemo } from "react";
import { ArticleTile } from "@/components/ArticleTile";
import { planMosaic } from "@/lib/mosaic";
import type { ScrapedArticle } from "@/types/article";

type A4MosaicProps = {
  articles: ScrapedArticle[];
  onChange: (id: string, patch: Partial<Pick<ScrapedArticle, "title" | "content">>) => void;
};

export function A4Mosaic({ articles, onChange }: A4MosaicProps) {
  const plan = useMemo(() => planMosaic(articles), [articles]);
  const byId = useMemo(
    () => new Map(articles.map((article) => [article.id, article])),
    [articles],
  );

  return (
    <div className="a4-page flex flex-col bg-[#fbf8f1] text-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <header className="flex shrink-0 items-end justify-between border-b-2 border-neutral-900 px-3 pt-2 pb-1">
        <p className="font-serif text-[11px] tracking-[0.28em] uppercase">
          News Mosaic
        </p>
        <p className="font-serif text-[10px] text-neutral-600">
          A4 · {articles.length}/4
        </p>
      </header>

      <div
        className="min-h-0 flex-1 p-1.5"
        style={{
          display: "grid",
          gridTemplateColumns: plan.columns,
          gridTemplateRows: plan.rows,
          gap: "6px",
        }}
      >
        {articles.length === 0 ? (
          <div className="flex items-center justify-center border border-dashed border-neutral-400 text-center font-serif text-sm text-neutral-500">
            URL을 입력해 기사를 추가하면
            <br />
            A4 모자이크가 자동으로 배치됩니다.
          </div>
        ) : (
          plan.placements.map((placement) => {
            const article = byId.get(placement.id);
            if (!article) return null;
            return (
              <div
                key={placement.id}
                className="min-h-0 min-w-0"
                style={{
                  gridColumn: `${placement.column} / span ${placement.colSpan}`,
                  gridRow: `${placement.row} / span ${placement.rowSpan}`,
                }}
              >
                <ArticleTile article={article} onChange={onChange} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
