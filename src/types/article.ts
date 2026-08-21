export type ScrapedArticle = {
  id: string;
  url: string;
  title: string;
  content: string;
  image: string | null;
};

export type ScrapeResponse = {
  title: string;
  content: string;
  image: string | null;
  url: string;
};

export type ScrapeError = {
  error: string;
};
