export function joinBasePath(baseUrl: string, href: string): string {
  if (!href) return href;
  if (/^[a-z]+:/i.test(href) || href.startsWith("#")) return href;

  const normalizedBase = !baseUrl || baseUrl === "/" ? "/" : (baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (normalizedBase === "/") {
    return href;
  }

  if (href === "/") {
    return normalizedBase;
  }

  const relativePath = href.startsWith("/") ? href.slice(1) : href;
  return `${normalizedBase}${relativePath}`;
}

export function withBase(href: string): string {
  return joinBasePath(import.meta.env.BASE_URL || "/", href);
}
