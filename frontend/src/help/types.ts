export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  /** Optional second nav level within a category (e.g. "Lifecycle", "For IT staff"). */
  group?: string;
  summary: string;
  keywords: string[];
  screenshot?: string;
  callouts?: { n: number; label: string }[];
  body: string;
}
