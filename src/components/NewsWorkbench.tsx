"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Newspaper, Plus, Printer, Trash2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { A4Mosaic } from "@/components/A4Mosaic";
import type { ScrapedArticle, ScrapeError, ScrapeResponse } from "@/types/article";

const MAX_ARTICLES = 4;
const A4_WIDTH_PX = (210 / 25.4) * 96;

export function NewsWorkbench() {
  const [url, setUrl] = useState("");
  const [articles, setArticles] = useState<ScrapedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const printRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "news-mosaic",
    pageStyle: `
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; background: white; }
    `,
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateScale = () => {
      const available = stage.clientWidth;
      setScale(Math.min(1, available / A4_WIDTH_PX));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const addArticle = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (loading || articles.length >= MAX_ARTICLES) return;

      const nextUrl = url.trim();
      if (!nextUrl) {
        setError("기사 URL을 입력해 주세요.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: nextUrl }),
        });
        const data = (await response.json()) as ScrapeResponse | ScrapeError;

        if (!response.ok || "error" in data) {
          setError("error" in data ? data.error : "기사를 추가하지 못했습니다.");
          return;
        }

        const article: ScrapedArticle = {
          id: crypto.randomUUID(),
          url: data.url,
          title: data.title,
          content: data.content,
          image: data.image,
        };

        setArticles((prev) => [...prev, article]);
        setUrl("");
      } catch {
        setError("네트워크 오류로 기사를 가져오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [articles.length, loading, url],
  );

  const removeArticle = (id: string) => {
    setArticles((prev) => prev.filter((article) => article.id !== id));
  };

  const updateArticle = (
    id: string,
    patch: Partial<Pick<ScrapedArticle, "title" | "content">>,
  ) => {
    setArticles((prev) =>
      prev.map((article) => (article.id === id ? { ...article, ...patch } : article)),
    );
  };

  const remaining = MAX_ARTICLES - articles.length;

  return (
    <div className="min-h-full bg-[#d9d3c5] text-neutral-900">
      <header className="no-print sticky top-0 z-10 border-b border-neutral-300 bg-[#f7f3ea]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            <h1 className="font-serif text-lg font-bold">신문 기사 스크랩</h1>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            disabled={articles.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            PDF로 인쇄/저장
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start">
        <aside className="no-print w-full shrink-0 rounded-xl border border-neutral-300 bg-[#f7f3ea] p-4 shadow-sm lg:w-80">

          <form onSubmit={addArticle} className="flex flex-col gap-2">
            <label htmlFor="article-url" className="text-xs font-medium text-neutral-600">
              기사 URL
            </label>
            <input
              id="article-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              disabled={loading || remaining === 0}
              className="w-full rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm outline-none ring-neutral-800 focus:ring-2 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || remaining === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              기사 추가 ({articles.length}/{MAX_ARTICLES})
            </button>
          </form>

          {error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <ul className="mt-5 flex flex-col gap-2">
            {articles.map((article, index) => (
              <li
                key={article.id}
                className="flex items-start justify-between gap-2 rounded-md border border-neutral-300 bg-white p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {index + 1}. {article.title || "제목 없음"}
                  </p>
                  <p className="truncate text-[11px] text-neutral-500">{article.url}</p>
                  <p className="text-[11px] text-neutral-500">
                    {article.content.replace(/\s/g, "").length}자
                    {article.image ? " · 이미지" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeArticle(article.id)}
                  className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-700"
                  aria-label="기사 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div ref={stageRef} className="min-w-0 flex-1 overflow-x-auto pb-8">
          <div
            className="mx-auto"
            style={{
              width: A4_WIDTH_PX * scale,
              height: A4_WIDTH_PX * (297 / 210) * scale,
            }}
          >
            <div
              className="origin-top-left"
              style={{ transform: `scale(${scale})` }}
            >
              <div ref={printRef}>
                <A4Mosaic articles={articles} onChange={updateArticle} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
