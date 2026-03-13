import projects from "../../data/projects.json" with { type: "json" };
import proofs from "../../data/audit/proofs.json" with { type: "json" };
import releases from "../../data/releases.json" with { type: "json" };
import collections from "../../data/collections.json" with { type: "json" };
import marketplaceSeed from "../../data/marketplace-seed.json" with { type: "json" };
import orgStats from "../../data/org-stats.json" with { type: "json" };
import { CATEGORY_META, MARKETPLACE_DOCS, MARKETPLACE_FAQ, MARKETPLACE_PRESETS, PLATFORM_META } from "./marketplace-content.ts";

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
    compatibility: number;
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
  trendScore: number;
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

export interface RelatedToolMatch {
  entry: CatalogEntry;
  score: number;
  reason: string;
  compareHref: string;
}

export interface ComparisonModel {
  left: CatalogEntry;
  right: CatalogEntry;
  compareTitle: string;
  summary: string;
  sections: {
    compatibility: string[];
    adoption: string[];
    signals: string[];
  };
  scorecard: Array<{
    label: string;
    left: string;
    right: string;
    insight: string;
  }>;
  recommendations: {
    left: string[];
    right: string[];
  };
  lanePairs: ComparisonPair[];
}

export interface ComparisonPair {
  left: CatalogEntry;
  right: CatalogEntry;
  href: string;
  reason: string;
  pairScore: number;
}

export interface ComparisonPairOptions {
  maxPairs?: number;
  maxPairsPerTool?: number;
  minPairScore?: number;
}

export interface ComparisonHubGroup {
  slug: string;
  title: string;
  description: string;
  kind: "category" | "platform";
  pairs: ComparisonPair[];
}

export interface CompareHubModel {
  allPairs: ComparisonPair[];
  pagePairs: ComparisonPair[];
  featuredPairs: ComparisonPair[];
  groups: ComparisonHubGroup[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalPairs: number;
}

export interface BrowseState {
  q: string;
  category: string;
  source: string;
  platform: string;
  type: string;
  pricing: string;
  freshness: string;
  verified: boolean;
  sort: string;
  page: number;
}

export interface BrowsePresetModel {
  slug: string;
  title: string;
  summary: string;
  description: string;
  eyebrow: string;
  rationale: string[];
  state: Partial<BrowseState>;
  featuredTools: CatalogEntry[];
  browseHref: string;
  count: number;
  averageScore: number;
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
  presets: BrowsePresetModel[];
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

function chooseFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }

  return "";
}

function normalizeCatalogText(value: string, fallback: string) {
  const text = cleanText(value, fallback)
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return text || fallback;
}

export function getDefaultBrowseState(): BrowseState {
  return {
    q: "",
    category: "",
    source: "",
    platform: "",
    type: "",
    pricing: "",
    freshness: "",
    verified: false,
    sort: "quality",
    page: 1,
  };
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
  const explicit = cleanText(raw.pricing).toLowerCase();
  const text = getReferenceText(raw);
  const install = cleanText(raw.install).toLowerCase();
  const homepage = cleanText(raw.homepage);
  const repoUrl = getRepoUrl(raw);

  if (explicit === "open-source" || explicit === "free" || explicit === "commercial") {
    return explicit as PricingModel;
  }

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
  if (/\bchatgpt|openai\b/.test(text)) slugs.push("chatgpt");
  if (/\bcursor\b/.test(text)) slugs.push("cursor");
  if (/\bwindsurf\b/.test(text)) slugs.push("windsurf");
  if (/\bgemini|google ai\b/.test(text)) slugs.push("gemini");
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

const genericPlatformSlugs = new Set(["any-mcp-client", "terminal", "desktop"]);
const BASE_SCORE_OFFSET = 12;

function getLatestActivityDate(...candidates: Array<string | undefined>) {
  const timestamps = candidates
    .map((candidate) => (candidate ? new Date(candidate).getTime() : 0))
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0);

  if (timestamps.length === 0) {
    return "";
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function getFreshnessScore(updatedAt: string, releasePublishedAt?: string) {
  const days = getDaysSince(getLatestActivityDate(updatedAt, releasePublishedAt));
  if (days <= 14) return { score: 18, label: "Updated this month" };
  if (days <= 45) return { score: 15, label: "Updated recently" };
  if (days <= 90) return { score: 11, label: "Updated this quarter" };
  if (days <= 180) return { score: 7, label: "Updated this half" };
  return { score: 3, label: "Needs a freshness check" };
}

function getReleaseCadenceScore(releasePublishedAt: string, updatedAt: string) {
  const releaseDays = getDaysSince(releasePublishedAt);
  if (!Number.isFinite(releaseDays)) return 0;

  const releaseTimestamp = new Date(releasePublishedAt).getTime();
  const updateTimestamp = new Date(updatedAt).getTime();
  const closeToUpdate =
    Number.isFinite(releaseTimestamp) &&
    Number.isFinite(updateTimestamp) &&
    Math.abs(releaseTimestamp - updateTimestamp) <= 90 * 86_400_000;

  if (releaseDays <= 45) return closeToUpdate ? 5 : 4;
  if (releaseDays <= 90) return closeToUpdate ? 4 : 3;
  if (releaseDays <= 180) return 1;
  return 0;
}

function getDocsMaturityScore(raw: RawProject, docsUrl: string, homepage: string) {
  const docsAreReadme = docsUrl.toLowerCase().includes("#readme");
  const docsAreDedicated = Boolean(docsUrl && homepage && docsUrl !== homepage && !docsAreReadme);

  return (
    (docsUrl ? 8 : 0) +
    (homepage ? 6 : 0) +
    (cleanText(raw.description).length >= 24 ? 4 : 0) +
    (docsAreDedicated ? 6 : docsUrl !== homepage ? 2 : 0)
  );
}

function getCompatibilityQualityScore(compatibility: CompatibilityProfile) {
  const explicitPlatforms = compatibility.platforms.filter((platform) => !genericPlatformSlugs.has(platform.slug)).length;
  const genericPlatforms = compatibility.platforms.length - explicitPlatforms;
  const transportScore = Math.min(4, compatibility.transports.length * 2);
  const runtimeScore = Math.min(4, compatibility.runtimeSignals.length);
  const platformScore = explicitPlatforms * 4 + genericPlatforms * 2;
  const breadthBonus = explicitPlatforms >= 2 ? 2 : 0;

  return Math.min(14, platformScore + transportScore + runtimeScore + breadthBonus);
}

function getAdoptionScore(raw: RawProject, docsUrl: string, homepage: string) {
  const hasInstall = Boolean(cleanText(raw.install));
  const docsLedAccess = docsUrl ? 6 : homepage ? 4 : 0;
  const installScore = hasInstall ? 10 : docsLedAccess;
  const useCaseScore = Math.min(6, (Array.isArray(raw.goodFor) ? raw.goodFor.length : 0) * 3);
  const limitSignal = Array.isArray(raw.notFor) && raw.notFor.length > 0 ? 2 : 0;
  const accessBonus = derivePricingModel({ ...raw, homepage }) === "commercial" && !hasInstall ? 0 : 2;

  return installScore + useCaseScore + limitSignal + accessBonus;
}

function getPopularityScore(stars: number, updatedAt: string) {
  if (stars <= 0) return 0;
  const base = Math.min(16, Math.round(Math.log2(stars + 1) * 3));
  const recencyBoost = getDaysSince(updatedAt) <= 45 ? 2 : 0;
  return Math.min(16, base + recencyBoost);
}

function getTrustScore(raw: RawProject, proof: RawProof | undefined, release: RawRelease | undefined, docsUrl: string, homepage: string) {
  return (
    (Array.isArray(proof?.proofs) && proof.proofs.length > 0 ? 8 : 0) +
    (raw.registered ? 6 : 0) +
    (release ? 4 : 0) +
    (docsUrl && homepage ? 2 : 0)
  );
}

function getSourceTypeTrustScore(raw: RawProject, docsUrl: string, homepage: string) {
  const isExternal = !cleanText(raw.repo);

  if (isExternal) {
    return docsUrl && homepage ? 4 : 0;
  }

  return docsUrl && getRepoUrl(raw) ? 2 : 0;
}

function getPenaltyScore(raw: RawProject, docsUrl: string, homepage: string) {
  return (
    (raw.deprecated ? 18 : 0) +
    (cleanText(raw.description).length < 12 ? 12 : 0) +
    (!docsUrl && homepage ? 4 : 0)
  );
}

export function getTrendScore(entry: {
  updatedAt: string;
  releasePublishedAt?: string;
  quality: { score: number };
  stars: number;
  deprecated?: boolean;
  compatibility?: CompatibilityProfile;
  featured?: boolean;
  registered?: boolean;
}) {
  if (entry.deprecated) return 0;

  const latestActivity = getLatestActivityDate(entry.updatedAt, entry.releasePublishedAt);
  const freshnessDays = getDaysSince(latestActivity);
  const freshness = freshnessDays <= 14 ? 8 : freshnessDays <= 45 ? 6 : freshnessDays <= 90 ? 4 : freshnessDays <= 180 ? 2 : 0;
  const popularity = Math.min(6, getPopularityScore(entry.stars, entry.updatedAt));
  const quality = Math.round(entry.quality.score / 16);
  const compatibility = entry.compatibility ? Math.min(4, Math.floor(getCompatibilitySortScore(entry) / 5)) : 0;
  const curatedBoost = (entry.featured ? 2 : 0) + (entry.registered ? 1 : 0);

  return freshness + popularity + quality + compatibility + curatedBoost;
}

export function deriveQualityScore(raw: RawProject): QualityScoreBreakdown {
  const docsUrl = getDocsUrl(raw);
  const homepage = getHomepage(raw);
  const proof = proofByRepo.get(cleanText(raw.repo));
  const release = releaseByRepo.get(cleanText(raw.repo));
  const freshness = getFreshnessScore(cleanText(raw.updatedAt), cleanText(release?.publishedAt));
  const releaseCadence = getReleaseCadenceScore(cleanText(release?.publishedAt), cleanText(raw.updatedAt));
  const compatibility = deriveCompatibilityProfile(raw);
  const docs = getDocsMaturityScore(raw, docsUrl, homepage);
  const adoption = getAdoptionScore(raw, docsUrl, homepage);
  const compatibilityScore = getCompatibilityQualityScore(compatibility);
  const popularity = getPopularityScore(Number(raw.stars || 0), cleanText(raw.updatedAt));
  const trust = getTrustScore(raw, proof, release, docsUrl, homepage) + getSourceTypeTrustScore(raw, docsUrl, homepage);
  const media = cleanText(raw.screenshot) ? 8 : 0;
  const penalty = getPenaltyScore(raw, docsUrl, homepage);
  const score = Math.max(0, Math.min(100, docs + adoption + compatibilityScore + freshness.score + releaseCadence + popularity + trust + media - penalty + BASE_SCORE_OFFSET));
  const verified = score >= 72 && meetsPrimaryListingBar(raw);

  return {
    score,
    verified,
    label: score >= 86 ? "Leader" : score >= 72 ? "Strong" : score >= 56 ? "Emerging" : "Watch",
    breakdown: {
      docs,
      adoption,
      compatibility: compatibilityScore,
      freshness: freshness.score + releaseCadence,
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
  const proof = proofByRepo.get(repo);
  const release = releaseByRepo.get(repo);
  const freshness = getFreshnessScore(cleanText(raw.updatedAt), cleanText(release?.publishedAt));
  const releasePublishedAt = cleanText(release?.publishedAt) || undefined;
  const trendScore = getTrendScore({
    updatedAt: cleanText(raw.updatedAt),
    releasePublishedAt,
    quality,
    stars: Number(raw.stars || 0),
    deprecated: Boolean(raw.deprecated),
    compatibility,
    featured: Boolean(raw.featured),
    registered: Boolean(raw.registered),
  });

  return {
    slug: repo || cleanText(raw.slug),
    name: cleanText(raw.name, "Untitled MCP Tool"),
    summary: normalizeCatalogText(chooseFirstText(raw.tagline, raw.summary, raw.description), "MCP tool listing"),
    description: normalizeCatalogText(chooseFirstText(raw.description, raw.summary, raw.tagline, raw.name), "MCP tool listing"),
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
    isNew: getDaysSince(getLatestActivityDate(cleanText(raw.updatedAt), releasePublishedAt)) <= 45,
    isTrending: trendScore >= 16,
    install: cleanText(raw.install) || undefined,
    screenshot: cleanText(raw.screenshot) || undefined,
    screenshotType: cleanText(raw.screenshotType) || undefined,
    goodFor: Array.isArray(raw.goodFor) ? raw.goodFor.map((item) => cleanText(item)).filter(Boolean).slice(0, 4) : [],
    notFor: Array.isArray(raw.notFor) ? raw.notFor.map((item) => cleanText(item)).filter(Boolean).slice(0, 4) : [],
    releaseTag: cleanText(release?.tag) || undefined,
    releasePublishedAt,
    proofSignals: Array.isArray(proof?.proofs) ? proof.proofs : [],
    compatibility,
    quality,
    trendScore,
  };
}

function sortByQuality(a: CatalogEntry, b: CatalogEntry) {
  return (
    b.quality.score - a.quality.score ||
    b.trendScore - a.trendScore ||
    Number(b.featured) - Number(a.featured) ||
    b.stars - a.stars ||
    b.updatedAt.localeCompare(a.updatedAt) ||
    a.name.localeCompare(b.name)
  );
}

function sortByTrend(a: CatalogEntry, b: CatalogEntry) {
  return b.trendScore - a.trendScore || sortByQuality(a, b);
}

function sortByNewest(a: CatalogEntry, b: CatalogEntry) {
  return (
    getLatestActivityDate(b.updatedAt, b.releasePublishedAt).localeCompare(getLatestActivityDate(a.updatedAt, a.releasePublishedAt)) ||
    sortByQuality(a, b)
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
      description: cleanText(collection.description, "Curated tool set from the MCP marketplace."),
      count: tools.length,
      tools,
    };
  }).filter((collection) => collection.count > 0);
}

function averageScore(entries: CatalogEntry[]) {
  if (entries.length === 0) return 0;
  return Math.round(entries.reduce((total, entry) => total + entry.quality.score, 0) / entries.length);
}

export const MAX_COMPARE_PAIRS = 180;
export const COMPARE_PAGE_SIZE = 24;

export function applyBrowseState(entries: CatalogEntry[], partialState: Partial<BrowseState>) {
  const state = { ...getDefaultBrowseState(), ...partialState };

  return entries
    .filter((entry) => {
      const searchableText = `${entry.name} ${entry.summary} ${entry.description} ${entry.tags.join(" ")}`.toLowerCase();
      const matchesQuery = !state.q || searchableText.includes(state.q.toLowerCase());
      const matchesCategory = !state.category || entry.primaryCategory === state.category;
      const matchesSource = !state.source || entry.sourceType === state.source;
      const matchesPlatform = !state.platform || entry.compatibility.platforms.some((platform) => platform.slug === state.platform);
      const matchesType = !state.type || entry.kind === state.type;
      const matchesPricing = !state.pricing || entry.pricing === state.pricing;
      const matchesFreshness =
        !state.freshness ||
        (state.freshness === "new" ? entry.isNew : state.freshness === "recent" ? getDaysSince(entry.updatedAt) <= 90 : true);
      const matchesVerified = !state.verified || entry.quality.verified;

      return (
        matchesQuery &&
        matchesCategory &&
        matchesSource &&
        matchesPlatform &&
        matchesType &&
        matchesPricing &&
        matchesFreshness &&
        matchesVerified
      );
    })
    .sort((a, b) => {
      switch (state.sort) {
        case "compatibility":
          return getCompatibilitySortScore(b) - getCompatibilitySortScore(a) || sortByQuality(a, b);
        case "newest":
          return sortByNewest(a, b);
        case "stars":
          return b.stars - a.stars || sortByQuality(a, b);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return sortByQuality(a, b);
      }
    });
}

export function buildBrowseHref(partialState: Partial<BrowseState>) {
  const state = { ...getDefaultBrowseState(), ...partialState };
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.category) params.set("category", state.category);
  if (state.source) params.set("source", state.source);
  if (state.platform) params.set("platform", state.platform);
  if (state.type) params.set("type", state.type);
  if (state.pricing) params.set("pricing", state.pricing);
  if (state.freshness) params.set("freshness", state.freshness);
  if (state.verified) params.set("verified", "1");
  if (state.sort && state.sort !== "quality") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return query ? `/tools/?${query}` : "/tools/";
}

function buildPresetModels(entries: CatalogEntry[]) {
  return (MARKETPLACE_PRESETS as Array<Record<string, any>>).map((preset) => {
    const state = { ...getDefaultBrowseState(), ...(preset.state || {}) };
    const matchedTools = applyBrowseState(entries, preset.state || {});

    return {
      slug: cleanText(preset.slug),
      title: cleanText(preset.title),
      summary: cleanText(preset.summary),
      description: cleanText(preset.description),
      eyebrow: cleanText(preset.eyebrow, "Preset"),
      rationale: Array.isArray(preset.rationale) ? preset.rationale.filter(Boolean) : [],
      state,
      featuredTools: matchedTools.slice(0, 6),
      browseHref: buildBrowseHref(state),
      count: matchedTools.length,
      averageScore: averageScore(matchedTools),
    };
  });
}

export function buildMarketplaceContent(
  projectItems: RawProject[] = projects as RawProject[],
  externalSeedItems: RawProject[] = marketplaceSeed as RawProject[],
): MarketplaceContent {
  const allEntries = [...projectItems, ...externalSeedItems].map((project) => buildCatalogEntry(project)).sort(sortByQuality);
  const primaryCatalog = allEntries.filter((entry) => entry.meetsListingBar).sort(sortByQuality);
  const primarySlugs = new Set(primaryCatalog.map((entry) => entry.slug));
  const secondaryCatalog = allEntries.filter((entry) => !primarySlugs.has(entry.slug));
  const categories = buildCategoryModels(primaryCatalog);
  const platforms = buildPlatformModels(primaryCatalog);
  const collectionModels = buildCollectionModels(primaryCatalog);
  const presets = buildPresetModels(primaryCatalog);
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
      trending: primaryCatalog.filter((entry) => entry.isTrending && !entry.deprecated).sort(sortByTrend).slice(0, 8),
      newest: primaryCatalog.filter((entry) => entry.isNew && !entry.deprecated).sort(sortByNewest).slice(0, 8),
    },
    categories,
    platforms,
    collections: collectionModels,
    presets,
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

export function getBrowsePresetModels() {
  return marketplaceContent.presets;
}

export function getBrowsePresetModel(slug: string) {
  return marketplaceContent.presets.find((preset) => preset.slug === slug);
}

export function getCompareHubModel(page = 1, pageSize = COMPARE_PAGE_SIZE): CompareHubModel {
  const allPairs = getComparisonPairs({ maxPairs: MAX_COMPARE_PAIRS });
  const totalPages = Math.max(1, Math.ceil(allPairs.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    allPairs,
    pagePairs: allPairs.slice(startIndex, startIndex + pageSize),
    featuredPairs: getFeaturedComparisonPairs(12),
    groups: getComparisonHubGroups(6),
    page: safePage,
    pageSize,
    totalPages,
    totalPairs: allPairs.length,
  };
}

export function getDocEntry(slug: string) {
  return marketplaceContent.docs.find((doc) => doc.slug === slug);
}

export function normalizeComparisonPair(leftSlug: string, rightSlug: string) {
  if (leftSlug === rightSlug) {
    return [leftSlug, rightSlug];
  }

  return leftSlug < rightSlug ? [leftSlug, rightSlug] : [rightSlug, leftSlug];
}

export function isCanonicalComparisonPair(leftSlug: string, rightSlug: string) {
  const [normalizedLeft, normalizedRight] = normalizeComparisonPair(leftSlug, rightSlug);
  return normalizedLeft === leftSlug && normalizedRight === rightSlug;
}

export function buildCanonicalCompareHref(leftSlug: string, rightSlug: string) {
  const [left, right] = normalizeComparisonPair(leftSlug, rightSlug);
  return `/compare/${left}-vs-${right}/`;
}

export function getCompatibilitySortScore(entryLike: { compatibility: { platforms: { slug: string }[] } }) {
  const platforms = entryLike?.compatibility?.platforms || [];
  const explicitPlatforms = platforms.filter((platform) => !genericPlatformSlugs.has(platform.slug));
  return explicitPlatforms.length * 10 + platforms.length;
}

export function getRelatedTools(slug: string): RelatedToolMatch[] {
  const tool = getToolDossier(slug);
  if (!tool) return [];

  const toolTags = new Set(tool.tags);
  const specificPlatforms = new Set(
    tool.compatibility.platforms
      .map((platform) => platform.slug)
      .filter((platform) => !genericPlatformSlugs.has(platform)),
  );

  return marketplaceContent.catalog.primary
    .filter((entry) => entry.slug !== tool.slug)
    .map((entry) => {
      const sharedTags = entry.tags.filter((tag) => toolTags.has(tag));
      const sharedSpecificPlatforms = entry.compatibility.platforms.filter((platform) => specificPlatforms.has(platform.slug));
      const categoryMatch = entry.primaryCategory === tool.primaryCategory;
      const score = (categoryMatch ? 4 : 0) + sharedTags.length * 2 + sharedSpecificPlatforms.length * 3;
      let reason = "";

      if (categoryMatch && sharedTags.length > 0) reason = "Same category and shared workflow tags";
      else if (categoryMatch) reason = "Same primary category";
      else if (sharedSpecificPlatforms.length > 0) reason = "Shared explicit client compatibility";
      else if (sharedTags.length > 0) reason = "Shared workflow tags";

      return {
        entry,
        score,
        reason,
        compareHref: buildCanonicalCompareHref(tool.slug, entry.slug),
      };
    })
    .filter((candidate) => candidate.score >= 4)
    .sort((a, b) => b.score - a.score || b.entry.quality.score - a.entry.quality.score)
    .slice(0, 4);
}

function buildComparisonPairScore(source: CatalogEntry, match: RelatedToolMatch) {
  return (
    match.score * 100 +
    source.quality.score +
    match.entry.quality.score +
    source.trendScore +
    match.entry.trendScore
  );
}

function sortComparisonPairs(a: ComparisonPair, b: ComparisonPair) {
  return (
    b.pairScore - a.pairScore ||
    b.left.quality.score + b.right.quality.score - (a.left.quality.score + a.right.quality.score) ||
    a.left.slug.localeCompare(b.left.slug) ||
    a.right.slug.localeCompare(b.right.slug)
  );
}

export function getComparisonPairs(options: ComparisonPairOptions = {}): ComparisonPair[] {
  const {
    maxPairs = MAX_COMPARE_PAIRS,
    maxPairsPerTool = 3,
    minPairScore = 4,
  } = options;
  const candidateByKey = new Map<string, ComparisonPair>();

  for (const entry of marketplaceContent.catalog.primary) {
    for (const match of getRelatedTools(entry.slug)) {
      if (match.score < minPairScore) continue;

      const [leftSlug, rightSlug] = normalizeComparisonPair(entry.slug, match.entry.slug);
      const key = `${leftSlug}|${rightSlug}`;
      const left = getToolDossier(leftSlug);
      const right = getToolDossier(rightSlug);
      if (!left || !right) continue;
      const nextPair: ComparisonPair = {
        left,
        right,
        href: buildCanonicalCompareHref(left.slug, right.slug),
        reason: match.reason,
        pairScore: buildComparisonPairScore(entry, match),
      };
      const existing = candidateByKey.get(key);
      if (!existing || nextPair.pairScore > existing.pairScore) {
        candidateByKey.set(key, nextPair);
      }
    }
  }

  const exposureCounts = new Map<string, number>();
  const selected: ComparisonPair[] = [];

  for (const pair of [...candidateByKey.values()].sort(sortComparisonPairs)) {
    const leftCount = exposureCounts.get(pair.left.slug) || 0;
    const rightCount = exposureCounts.get(pair.right.slug) || 0;
    if (leftCount >= maxPairsPerTool || rightCount >= maxPairsPerTool) continue;

    selected.push(pair);
    exposureCounts.set(pair.left.slug, leftCount + 1);
    exposureCounts.set(pair.right.slug, rightCount + 1);

    if (selected.length >= maxPairs) break;
  }

  return selected;
}

export function getFeaturedComparisonPairs(limit = 24) {
  return getComparisonPairs({
    maxPairs: limit,
    maxPairsPerTool: 2,
    minPairScore: 5,
  });
}

export function getComparisonHubGroups(limitPerGroup = 6): ComparisonHubGroup[] {
  const sourcePairs = getComparisonPairs({
    maxPairs: 72,
    maxPairsPerTool: 3,
    minPairScore: 5,
  });
  const categoryGroups = marketplaceContent.categories
    .map((category) => ({
      slug: category.slug,
      title: category.title,
      description: category.description,
      kind: "category" as const,
      pairs: sourcePairs.filter(
        (pair) =>
          pair.left.primaryCategory === category.slug &&
          pair.right.primaryCategory === category.slug,
      ).slice(0, limitPerGroup),
    }))
    .filter((group) => group.pairs.length > 0)
    .slice(0, 5);
  const platformGroups = marketplaceContent.platforms
    .filter((platform) => !genericPlatformSlugs.has(platform.slug))
    .map((platform) => ({
      slug: platform.slug,
      title: platform.title,
      description: platform.description,
      kind: "platform" as const,
      pairs: sourcePairs.filter((pair) => {
        const leftPlatforms = pair.left.compatibility.platforms.map((entry) => entry.slug);
        const rightPlatforms = pair.right.compatibility.platforms.map((entry) => entry.slug);
        return leftPlatforms.includes(platform.slug) && rightPlatforms.includes(platform.slug);
      }).slice(0, limitPerGroup),
    }))
    .filter((group) => group.pairs.length > 0)
    .slice(0, 5);

  return [...categoryGroups, ...platformGroups];
}

function formatPricingLabel(pricing: PricingModel) {
  return pricing === "open-source" ? "Open Source" : pricing === "commercial" ? "Commercial" : "Free";
}

export function buildComparisonModel(leftSlug: string, rightSlug: string): ComparisonModel {
  const left = getToolDossier(leftSlug);
  const right = getToolDossier(rightSlug);

  if (!left || !right) {
    throw new Error(`Unknown comparison pair: ${leftSlug} vs ${rightSlug}`);
  }

  const leftPlatforms = left.compatibility.platforms.map((platform) => platform.title).join(", ") || "No explicit platform hints";
  const rightPlatforms = right.compatibility.platforms.map((platform) => platform.title).join(", ") || "No explicit platform hints";
  const sharedPlatforms = left.compatibility.platforms
    .map((platform) => platform.title)
    .filter((platform, index, items) => items.indexOf(platform) === index)
    .filter((platform) => right.compatibility.platforms.some((candidate) => candidate.title === platform));
  const qualityLeader = left.quality.score === right.quality.score ? null : left.quality.score > right.quality.score ? left : right;
  const compatibilityLeader = getCompatibilitySortScore(left) === getCompatibilitySortScore(right)
    ? null
    : getCompatibilitySortScore(left) > getCompatibilitySortScore(right)
      ? left
      : right;
  const adoptionLeader = Boolean(left.install) === Boolean(right.install)
    ? null
    : left.install
      ? left
      : right;
  const trendLeader = left.trendScore === right.trendScore ? null : left.trendScore > right.trendScore ? left : right;
  const summaryParts = [
    qualityLeader ? `${qualityLeader.name} carries the stronger marketplace score.` : "Both tools land in the same overall quality band.",
    compatibilityLeader ? `${compatibilityLeader.name} exposes broader explicit client or runtime coverage.` : "Compatibility depth is comparable, so adoption posture matters more.",
    adoptionLeader ? `${adoptionLeader.name} offers the more direct adoption path.` : "Both tools need a closer dossier read before deciding on adoption speed.",
    trendLeader ? `${trendLeader.name} currently has more trend momentum across freshness and ranking signals.` : "Momentum is comparable, so the choice should come from workflow fit rather than recency alone.",
  ];
  const leftRecommendations = [
    left.goodFor[0] ? `Choose ${left.name} if you care about ${left.goodFor[0]}.` : `Choose ${left.name} if its ${left.primaryCategoryTitle.toLowerCase()} posture fits your workflow.`,
    left.compatibility.platforms[0] ? `Choose ${left.name} if you already target ${left.compatibility.platforms[0].title}.` : `Choose ${left.name} if you want a lighter-weight compatibility surface.`,
    left.install ? `Choose ${left.name} if you want a direct install path.` : `Choose ${left.name} if docs-led or hosted onboarding is acceptable.`,
  ];
  const rightRecommendations = [
    right.goodFor[0] ? `Choose ${right.name} if you care about ${right.goodFor[0]}.` : `Choose ${right.name} if its ${right.primaryCategoryTitle.toLowerCase()} posture fits your workflow.`,
    right.compatibility.platforms[0] ? `Choose ${right.name} if you already target ${right.compatibility.platforms[0].title}.` : `Choose ${right.name} if you want a lighter-weight compatibility surface.`,
    right.install ? `Choose ${right.name} if you want a direct install path.` : `Choose ${right.name} if docs-led or hosted onboarding is acceptable.`,
  ];
  const lanePairs = getComparisonPairs({
    maxPairs: 12,
    maxPairsPerTool: 6,
    minPairScore: 5,
  })
    .filter((pair) => pair.href !== buildCanonicalCompareHref(left.slug, right.slug))
    .filter(
      (pair) =>
        pair.left.primaryCategory === left.primaryCategory ||
        pair.right.primaryCategory === left.primaryCategory ||
        pair.left.primaryCategory === right.primaryCategory ||
        pair.right.primaryCategory === right.primaryCategory,
    )
    .slice(0, 4);

  return {
    left,
    right,
    compareTitle: `${left.name} vs ${right.name}`,
    summary: summaryParts.join(" "),
    sections: {
      compatibility: [
        `${left.name}: ${leftPlatforms}`,
        `${right.name}: ${rightPlatforms}`,
        `${left.name} transports: ${left.compatibility.transports.join(", ") || "No explicit transport hints"}`,
        `${right.name} transports: ${right.compatibility.transports.join(", ") || "No explicit transport hints"}`,
        sharedPlatforms.length > 0 ? `Shared platforms: ${sharedPlatforms.join(", ")}` : "Shared platforms: none declared",
      ],
      adoption: [
        `${left.name} install: ${left.install || "Docs / hosted access"}`,
        `${right.name} install: ${right.install || "Docs / hosted access"}`,
        `${left.name} pricing: ${formatPricingLabel(left.pricing)}`,
        `${right.name} pricing: ${formatPricingLabel(right.pricing)}`,
      ],
      signals: [
        `${left.name} quality: ${left.quality.score} (${left.quality.label})`,
        `${right.name} quality: ${right.quality.score} (${right.quality.label})`,
        `${left.name} freshness: ${left.freshnessLabel}`,
        `${right.name} freshness: ${right.freshnessLabel}`,
        `${left.name} trend score: ${left.trendScore}`,
        `${right.name} trend score: ${right.trendScore}`,
      ],
    },
    scorecard: [
      {
        label: "Marketplace score",
        left: `${left.quality.score} (${left.quality.label})`,
        right: `${right.quality.score} (${right.quality.label})`,
        insight: qualityLeader ? `${qualityLeader.name} leads on visible ranking signals.` : "This dimension is effectively tied.",
      },
      {
        label: "Compatibility depth",
        left: `${left.compatibility.platforms.length} platforms / ${left.compatibility.transports.length || 0} transports`,
        right: `${right.compatibility.platforms.length} platforms / ${right.compatibility.transports.length || 0} transports`,
        insight: compatibilityLeader ? `${compatibilityLeader.name} shows broader explicit integration clues.` : "Both tools expose similar compatibility depth.",
      },
      {
        label: "Adoption path",
        left: left.install || "Docs / hosted access",
        right: right.install || "Docs / hosted access",
        insight: adoptionLeader ? `${adoptionLeader.name} should be faster to trial from the compare page.` : "Neither tool has a clearly easier first step from metadata alone.",
      },
      {
        label: "Freshness",
        left: left.freshnessLabel,
        right: right.freshnessLabel,
        insight: left.freshnessLabel === right.freshnessLabel ? "Both tools signal similar recency." : "Use freshness as a tie-breaker only after compatibility and adoption.",
      },
      {
        label: "Trend momentum",
        left: `${left.trendScore}`,
        right: `${right.trendScore}`,
        insight: trendLeader ? `${trendLeader.name} is currently moving faster on live marketplace signals.` : "Momentum is effectively tied between these two listings.",
      },
    ],
    recommendations: {
      left: leftRecommendations,
      right: rightRecommendations,
    },
    lanePairs,
  };
}
