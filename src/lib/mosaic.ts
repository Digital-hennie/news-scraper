import type { ScrapedArticle } from "@/types/article";

export type GridPlacement = {
  id: string;
  column: number;
  row: number;
  colSpan: number;
  rowSpan: number;
};

export type MosaicPlan = {
  columns: string;
  rows: string;
  placements: GridPlacement[];
};

export function scoreArticle(article: ScrapedArticle): number {
  const length = article.content.replace(/\s/g, "").length;
  const imageBonus = article.image ? 320 : 0;
  return Math.max(length, 120) + imageBonus;
}

export function planMosaic(articles: ScrapedArticle[]): MosaicPlan {
  const items = articles.map((article) => ({
    id: article.id,
    score: scoreArticle(article),
  }));
  const n = items.length;

  if (n === 0) {
    return { columns: "1fr", rows: "1fr", placements: [] };
  }

  if (n === 1) {
    return {
      columns: "1fr",
      rows: "1fr",
      placements: [
        { id: items[0].id, column: 1, row: 1, colSpan: 1, rowSpan: 1 },
      ],
    };
  }

  const ranked = [...items].sort((a, b) => b.score - a.score);

  if (n === 2) {
    const [a, b] = ranked;
    return {
      columns: `${a.score}fr ${b.score}fr`,
      rows: "1fr",
      placements: [
        { id: a.id, column: 1, row: 1, colSpan: 1, rowSpan: 1 },
        { id: b.id, column: 2, row: 1, colSpan: 1, rowSpan: 1 },
      ],
    };
  }

  if (n === 3) {
    const [a, b, c] = ranked;
    return {
      columns: `${a.score}fr ${Math.max(b.score, c.score)}fr`,
      rows: `${b.score}fr ${c.score}fr`,
      placements: [
        { id: a.id, column: 1, row: 1, colSpan: 1, rowSpan: 2 },
        { id: b.id, column: 2, row: 1, colSpan: 1, rowSpan: 1 },
        { id: c.id, column: 2, row: 2, colSpan: 1, rowSpan: 1 },
      ],
    };
  }

  const [a, b, c, d] = ranked;
  const total = a.score + b.score + c.score + d.score;
  const isDominant = a.score / total >= 0.42;

  if (isDominant) {
    return {
      columns: `${a.score}fr ${Math.max(b.score, c.score)}fr`,
      rows: `${b.score}fr ${c.score}fr ${d.score}fr`,
      placements: [
        { id: a.id, column: 1, row: 1, colSpan: 1, rowSpan: 2 },
        { id: b.id, column: 2, row: 1, colSpan: 1, rowSpan: 1 },
        { id: c.id, column: 2, row: 2, colSpan: 1, rowSpan: 1 },
        { id: d.id, column: 1, row: 3, colSpan: 2, rowSpan: 1 },
      ],
    };
  }

  return {
    columns: `${a.score + c.score}fr ${b.score + d.score}fr`,
    rows: `${a.score + b.score}fr ${c.score + d.score}fr`,
    placements: [
      { id: a.id, column: 1, row: 1, colSpan: 1, rowSpan: 1 },
      { id: b.id, column: 2, row: 1, colSpan: 1, rowSpan: 1 },
      { id: c.id, column: 1, row: 2, colSpan: 1, rowSpan: 1 },
      { id: d.id, column: 2, row: 2, colSpan: 1, rowSpan: 1 },
    ],
  };
}
