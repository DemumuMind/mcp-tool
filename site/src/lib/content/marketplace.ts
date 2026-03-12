import projects from "../../data/projects.json" with { type: "json" };
import proofs from "../../data/audit/proofs.json" with { type: "json" };
import releases from "../../data/releases.json" with { type: "json" };
import collections from "../../data/collections.json" with { type: "json" };
import marketplaceSeed from "../../data/marketplace-seed.json" with { type: "json" };
import orgStats from "../../data/org-stats.json" with { type: "json" };
import { CATEGORY_META, MARKETPLACE_DOCS, MARKETPLACE_FAQ, PLATFORM_META } from "./marketplace-content.ts";

export type PricingModel = "open-source" | "free" | "commercial";

export interface CompatibilityPlatform {
  slug: string;
  title: string;
  description: string;
}

export interface CompatibilityProfile {
  platforms: CompatibilityPlatform[];
  transports: string[];
  runtimeSignals: string[];
}

export interface QualityScoreBreakdown {
  score: number;
  verified: boolean;
  label: "Leader" | "Strong" | "Emerging" | "Watch";
  breakdown: {
    docs: number;
    adoption: number;
    freshness: number;
    popularity: number;
    trust: number;
    media: number;
    penalty: number;
  };
}

export interface CatalogEntry {
  slug: string;
  name: string;
  summary: string;
  description: string;
  sourceType: "repo" | "external";
  meetsListingBar: boolean;
  repo?: string;
  repoUrl?: string;
  homepage: string;
  docsUrl: string;
  primaryActionUrl: string;
  kind: string;
  language: string;
  pricing: PricingModel;
  primaryCategory: string;
  primaryCategoryTitle: string;
  tags: string[];
  featured: boolean;
  registered: boolean;
  deprecated: boolean;
  stars: number;
  updatedAt: string;
  freshnessLabel: string;
  isNew: boolean;
  isTrending: boolean;
  install?: string;
  screenshot?: string;
  screenshotType?: string;
  goodFor: string[];
  notFor: string[];
  releaseTag?: string;
  releasePublishedAt?: string;
  proofSignals: string[];
  compatibility: CompatibilityProfile;
  quality: QualityScoreBreakdown;
}

export interface CategoryModel {
  slug: string;
  title: string;
  description: string;
  count: number;
  featuredTools: CatalogEntry[];
}

export interface PlatformModel {
  slug: string;
  title: string;
  description: string;
  count: number;
  featuredTools: CatalogEntry[];
}

export interface CollectionModel {
  slug: string;
  title: string;
  description: string;
  count: number;
  tools: CatalogEntry[];
}

export interface DocSection {
  title: string;
  body: string[];
  bullets?: string[];
}

export interface DocEntry {
  slug: string;
  title: string;
  summary: string;
  eyebrow: string;
  sections: DocSection[];
}

export interface FaqEntry {
  slug: string;
  question: string;
  answer: string;
}

export interface StatsSnapshot {
  totalListings: number;
  verifiedListings: number;
  openSourceListings: number;
  commercialListings: number;
  freshListings: number;
  averageScore: number;
  totalStars: number;
  topCategories: CategoryModel[];
  topPlatforms: PlatformModel[];
  sourceBreakdown: {
    registered: number;
    curated: number;
  };
}

export interface MarketplaceContent {
  catalog: {
    all: CatalogEntry[];
    primary: CatalogEntry[];
    secondary: CatalogEntry[];
    featured: CatalogEntry[];
    trending: CatalogEntry[];
    newest: CatalogEntry[];
  };
  categories: CategoryModel[];
  platforms: PlatformModel[];
  collections: CollectionModel[];
  docs: DocEntry[];
  faq: FaqEntry[];
  stats: StatsSnapshot;
}

type RawProject = Record<string, any>;
type RawProof = Record<string, any>;
type RawRelease = Record<string, any>;

const proofByRepo = new Map((proofs as RawProof[]).map((proof) => [String(proof.repo || ""), proof]));
const releaseByRepo = new Map((releases as RawRelease[]).map((release) => [String(release.repo || ""), release]));

const CATEGORY_FALLBACK = {
  title: "General MCP Tools",
  description: "General-purpose tools, adapters, and catalog entries that still belong in the MCP ecosystem.",
};

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function getRepoUrl(raw: RawProject) {
  const repo = cleanText(raw.repo);
  if (!repo) return "";
  return `https://github.com/DemumuMind/${repo}`;
}

function getHomepage(raw: RawProject) {
  const candidates = [cleanText(raw.homepage), cleanText(raw.flyio), cleanText(raw.smithery), getRepoUrl(raw)];
  return candidates.find(Boolean) || "";
}

function getDocsUrl(raw: RawProject) {
  const homepage = getHomepage(raw);
  const repoUrl = getRepoUrl(raw);
  return cleanText(raw.docsUrl) || cleanText(raw.smithery) || (repoUrl ? `${repoUrl}#readme` : homepage);
}

function getReferenceText(raw: RawProject) {
  return [
    cleanText(raw.name),
    cleanText(raw.kind),
    cleanText(raw.category),
    cleanText(raw.language),
    cleanText(raw.tagline),
    cleanText(raw.description),
    ...(Array.isArray(raw.tags) ? raw.tags : []),
  ]
    .join(" ")
    .toLowerCase();
}

export function derivePricingModel(raw: RawProject): PricingModel {
  const text = getReferenceText(raw);
  const install = cleanText(raw.install).toLowerCase();
  const homepage = cleanText(raw.homepage);
  const repoUrl = getRepoUrl(raw);

  if (/\b(enterprise|commercial|paid|pricing|contact sales)\b/.test(`${text} ${install}`)) {
    return "commercial";
  }

  if (homepage && !repoUrl) {
    return "commercial";
  }

  if (/\b(free|hosted|saas)\b/.test(text)) {
    return "free";
  }

  return "open-source";
}

function deriveTransports(raw: RawProject) {
  const text = getReferenceText(raw);
  const transports = [];

  if (/\b(http|https|rest|gateway|remote)\b/.test(text)) transports.push("HTTP");
  if (/\b(websocket|stream)\b/.test(text)) transports.push("WebSocket");
  if (cleanText(raw.kind) === "mcp-server" || /\bstdio|cli|terminal\b/.test(text)) transports.push("STDIO");

  return unique(transports);
}

function deriveRuntimeSignals(raw: RawProject) {
  const runtimeSignals = [cleanText(raw.language)];
  if (cleanText(raw.kind) === "desktop-app") runtimeSignals.push("Desktop");
  if (cleanText(raw.kind) === "cli") runtimeSignals.push("CLI");
  if (cleanText(raw.kind) === "vscode-extension") runtimeSignals.push("VS Code Extension");
  if (cleanText(raw.kind) === "mcp-server") runtimeSignals.push("MCP Server");

  return unique(runtimeSignals.filter(Boolean));
}

export function deriveCompatibilityProfile(raw: RawProject): CompatibilityProfile {
  const text = getReferenceText(raw);
  const slugs = [];

  if (cleanText(raw.kind) === "mcp-server" || /\bmcp\b/.test(text)) slugs.push("any-mcp-client");
  if (/\bclaude|anthropic\b/.test(text)) slugs.push("claude");
  if (/\bcursor\b/.test(text)) slugs.push("cursor");
  if (cleanText(raw.kind) === "vscode-extension" || /\bvscode|vs code\b/.test(text)) slugs.push("vscode");
  if (cleanText(raw.kind) === "desktop-app" || /\bdesktop|winui|maui\b/.test(text)) slugs.push("desktop");
  if (cleanText(raw.kind) === "cli" || /\bterminal|shell|command-line|cli\b/.test(text)) slugs.push("terminal");
  if (/\bbrowser|browser extension|webview|chrome|firefox\b/.test(text)) slugs.push("web");

  const platforms = unique(slugs)
    .map((slug) => ({ slug, ...(PLATFORM_META as Record<string, { title: string; description: string }>)[slug] }))
    .filter((platform) => Boolean(platform?.title));

  return {
    platforms,
    transports: deriveTransports(raw),
    runtimeSignals: deriveRuntimeSignals(raw),
  };
}

function deriveCategorySlug(raw: RawProject) {
  const explicit = cleanText(raw.category);
  if (explicit) return explicit;

  const text = getReferenceText(raw);
  const kind = cleanText(raw.kind);

  if (kind === "mcp-server") return "mcp-core";
  if (kind === "desktop-app") return "desktop";
  if (kind === "vscode-extension") return "devtools";
  if (/\bsecurity|audit|scanner|verify|attest|proof\b/.test(text)) return "security";
  if (/\bvoice|tts|speech|audio|soundboard\b/.test(text)) return "voice";
  if (/\bweb|browser|dom|html\b/.test(text)) return "web";
  if (/\btrain|ml|ai|model|llm|evaluation\b/.test(text)) return "ml";
  if (/\bgame|rpg|simulation|xrpl\b/.test(text)) return "games";
  if (kind === "cli" || kind === "library" || /\bdeveloper|code|testing|workflow|editor\b/.test(text)) return "devtools";

  return "infrastructure";
}

function getCategoryMeta(slug: string) {
  return (CATEGORY_META as Record<string, { title: string; description: string }>)[slug] || {
    title: titleCase(slug || "general"),
    description: CATEGORY_FALLBACK.description,
  };
}

function getDaysSince(dateValue: string) {
  const timestamp = dateValue ? new Date(dateValue).getTime() : 0;
  if (!timestamp) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function getFreshnessScore(updatedAt: string) {
  const days = getDaysSince(updatedAt);
  if (days <= 14) return { score: 18, label: "Updated this month" };
  if (days <= 45) return { score: 15, label: "Updated recently" };
  if (days <= 90) return { score: 11, label: "Updated this quarter" };
  if (days <= 180) return { score: 7, label: "Updated this half" };
  return { score: 3, label: "Needs a freshness check" };
}

export function deriveQualityScore(raw: RawProject): QualityScoreBreakdown {
  const docsUrl = getDocsUrl(raw);
  const homepage = getHomepage(raw);
  const proof = proofByRepo.get(cleanText(raw.repo));
  const release = releaseByRepo.get(cleanText(raw.repo));
  const freshness = getFreshnessScore(cleanText(raw.updatedAt));
  const docs = (docsUrl ? 12 : 0) + (homepage ? 8 : 0) + (cleanText(raw.description).length >= 24 ? 6 : 0);
  const adoption = (cleanText(raw.install) ? 12 : 0) + (Array.isArray(raw.goodFor) && raw.goodFor.length > 0 ? 8 : 0);
  const popularity = Math.min(16, Math.round((Number(raw.stars || 0) / 120) * 16));
  const trust = (proof?.proofs?.length ? 8 : 0) + (raw.registered ? 6 : 0) + (release ? 4 : 0);
  const media = cleanText(raw.screenshot) ? 8 : 0;
  const penalty = (raw.deprecated ? 18 : 0) + ((cleanText(raw.description).length < 12 ? 12 : 0));
  const score = Math.max(0, Math.min(100, docs + adoption + freshness.score + popularity + trust + media - penalty + 24));
  const verified = score >= 70 && meetsPrimaryListingBar(raw);

  return {
    score,
    verified,
    label: score >= 82 ? "Leader" : score >= 68 ? "Strong" : score >= 52 ? "Emerging" : "Watch",
    breakdown: {
      docs,
      adoption,
      freshness: freshness.score,
      popularity,
      trust,
      media,
      penalty,
    },
  };
}

export function meetsPrimaryListingBar(raw: RawProject) {
  const description = cleanText(raw.summary || raw.tagline || raw.description);
  const homepage = cleanText(raw.homepage) || getHomepage(raw);
  const docsUrl = cleanText(raw.docsUrl) || getDocsUrl(raw);
  const install = cleanText(raw.install);
  const kind = cleanText(raw.kind);

  return Boolean(description.length >= 16 && kind && (homepage || docsUrl) && (install || homepage || docsUrl));
}

function buildCatalogEntry(raw: RawProject): CatalogEntry {
  const repo = cleanText(raw.repo);
  const repoUrl = getRepoUrl(raw) || undefined;
  const homepage = getHomepage(raw);
  const docsUrl = getDocsUrl(raw);
  const categorySlug = deriveCategorySlug(raw);
  const categoryMeta = getCategoryMeta(categorySlug);
  const compatibility = deriveCompatibilityProfile(raw);
  const quality = deriveQualityScore({ ...raw, homepage, docsUrl });
  const release = releaseByRepo.get(repo);
  const freshness = getFreshnessScore(cleanText(raw.updatedAt));

  return {
    slug: repo || cleanText(raw.slug),
    name: cleanText(raw.name, "Untitled MCP Tool"),
    summary: cleanText(raw.tagline || raw.description, "MCP ecosystem listing"),
    description: cleanText(raw.description || raw.tagline, cleanText(raw.name, "MCP ecosystem listing")),
    sourceType: repo ? "repo" : "external",
    meetsListingBar: meetsPrimaryListingBar(raw),
    repo: repo || undefined,
    repoUrl,
    homepage,
    docsUrl,
    primaryActionUrl: docsUrl || homepage || repoUrl || "",
    kind: cleanText(raw.kind, "tool"),
    language: cleanText(raw.language, "Unknown"),
    pricing: derivePricingModel({ ...raw, homepage }),
    primaryCategory: categorySlug,
    primaryCategoryTitle: categoryMeta.title,
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    featured: Boolean(raw.featured),
    registered: Boolean(raw.registered),
    deprecated: Boolean(raw.deprecated),
    stars: Number(raw.stars || 0),
    updatedAt: cleanText(raw.updatedAt),
    freshnessLabel: freshness.label,
    isNew: getDaysSince(cleanText(raw.updatedAt)) <= 45,
    isTrending: getDaysSince(cleanText(raw.updatedAt)) <= 90 && Number(raw.stars || 0) >= 1,
    install: cleanText(raw.install) || undefined,
    screenshot: cleanText(raw.screenshot) || undefined,
    screenshotType: cleanText(raw.screenshotType) || undefined,
    goodFor: Array.isArray(raw.goodFor) ? raw.goodFor.filter(Boolean).slice(0, 4) : [],
    notFor: Array.isArray(raw.notFor) ? raw.notFor.filter(Boolean).slice(0, 4) : [],
    releaseTag: cleanText(release?.tag) || undefined,
    releasePublishedAt: cleanText(release?.publishedAt) || undefined,
    proofSignals: Array.isArray(proofByRepo.get(repo)?.proofs) ? proofByRepo.get(repo).proofs : [],
    compatibility,
    quality,
  };
}

function sortByQuality(a: CatalogEntry, b: CatalogEntry) {
  return (
    b.quality.score - a.quality.score ||
    Number(b.featured) - Number(a.featured) ||
    b.stars - a.stars ||
    b.updatedAt.localeCompare(a.updatedAt) ||
    a.name.localeCompare(b.name)
  );
}

function buildCategoryModels(entries: CatalogEntry[]): CategoryModel[] {
  return unique(entries.map((entry) => entry.primaryCategory))
    .map((slug) => {
      const scopedEntries = entries.filter((entry) => entry.primaryCategory === slug);
      const meta = getCategoryMeta(slug);
      return {
        slug,
        title: meta.title,
        description: meta.description,
        count: scopedEntries.length,
        featuredTools: scopedEntries.slice(0, 6),
      };
    })
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

function buildPlatformModels(entries: CatalogEntry[]): PlatformModel[] {
  const slugs = unique(entries.flatMap((entry) => entry.compatibility.platforms.map((platform) => platform.slug)));

  return slugs
    .map((slug) => {
      const meta = (PLATFORM_META as Record<string, { title: string; description: string }>)[slug];
      const scopedEntries = entries.filter((entry) => entry.compatibility.platforms.some((platform) => platform.slug === slug));
      return {
        slug,
        title: meta.title,
        description: meta.description,
        count: scopedEntries.length,
        featuredTools: scopedEntries.slice(0, 6),
      };
    })
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

function buildCollectionModels(entries: CatalogEntry[]): CollectionModel[] {
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));

  return (collections as Record<string, any>[]).map((collection) => {
    const tools = (Array.isArray(collection.repos) ? collection.repos : [])
      .map((repo) => bySlug.get(String(repo)))
      .filter(Boolean) as CatalogEntry[];

    return {
      slug: cleanText(collection.id),
      title: cleanText(collection.title, titleCase(cleanText(collection.id))),
      description: cleanText(collection.description, "Curated path through the MCP marketplace."),
      count: tools.length,
      tools,
    };
  }).filter((collection) => collection.count > 0);
}

function averageScore(entries: CatalogEntry[]) {
  if (entries.length === 0) return 0;
  return Math.round(entries.reduce((total, entry) => total + entry.quality.score, 0) / entries.length);
}

export function buildMarketplaceContent(
  projectItems: RawProject[] = projects as RawProject[],
  externalSeedItems: RawProject[] = marketplaceSeed as RawProject[],
): MarketplaceContent {
  const allEntries = [...projectItems, ...externalSeedItems].map((project) => buildCatalogEntry(project)).sort(sortByQuality);
  const primaryCatalog = allEntries.filter((entry) => entry.meetsListingBar).sort(sortByQuality);
  const secondaryCatalog = allEntries.filter((entry) => !primaryCatalog.some((primary) => primary.slug === entry.slug));
  const categories = buildCategoryModels(primaryCatalog);
  const platforms = buildPlatformModels(primaryCatalog);
  const collectionModels = buildCollectionModels(primaryCatalog);
  const docs = MARKETPLACE_DOCS.map((doc) => ({ ...doc }));
  const faq = MARKETPLACE_FAQ.map((item) => ({ ...item }));

  const stats: StatsSnapshot = {
    totalListings: primaryCatalog.length,
    verifiedListings: primaryCatalog.filter((entry) => entry.quality.verified).length,
    openSourceListings: primaryCatalog.filter((entry) => entry.pricing === "open-source").length,
    commercialListings: primaryCatalog.filter((entry) => entry.pricing === "commercial").length,
    freshListings: primaryCatalog.filter((entry) => entry.isNew).length,
    averageScore: averageScore(primaryCatalog),
    totalStars: primaryCatalog.reduce((total, entry) => total + entry.stars, 0),
    topCategories: categories.slice(0, 6),
    topPlatforms: platforms.slice(0, 6),
    sourceBreakdown: {
      registered: primaryCatalog.filter((entry) => entry.registered).length,
      curated: Number((orgStats as Record<string, any>).repoCount || primaryCatalog.length),
    },
  };

  return {
    catalog: {
      all: allEntries,
      primary: primaryCatalog,
      secondary: secondaryCatalog,
      featured: primaryCatalog.filter((entry) => entry.featured && !entry.deprecated).slice(0, 6),
      trending: primaryCatalog.filter((entry) => entry.isTrending && !entry.deprecated).slice(0, 8),
      newest: primaryCatalog.filter((entry) => entry.isNew && !entry.deprecated).slice(0, 8),
    },
    categories,
    platforms,
    collections: collectionModels,
    docs,
    faq,
    stats,
  };
}

const marketplaceContent = buildMarketplaceContent();

export function getMarketplaceContent() {
  return marketplaceContent;
}

export function getToolDossier(slug: string) {
  return marketplaceContent.catalog.all.find((entry) => entry.slug === slug);
}

export function getCategoryModel(slug: string) {
  return marketplaceContent.categories.find((category) => category.slug === slug);
}

export function getPlatformModel(slug: string) {
  return marketplaceContent.platforms.find((platform) => platform.slug === slug);
}

export function getCollectionModel(slug: string) {
  return marketplaceContent.collections.find((collection) => collection.slug === slug);
}

export function getDocEntry(slug: string) {
  return marketplaceContent.docs.find((doc) => doc.slug === slug);
}
