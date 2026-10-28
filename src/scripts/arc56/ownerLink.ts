/**
 * Link target for a publisher entry of the ARC-56 registry (AW-2026-095). The registry JSON is
 * fetched from a remote host, so its `url` is untrusted: a `javascript:` or look-alike URL must
 * never become an `href` in the signing review. Only github.com URLs are used as given; anything
 * else is rebuilt from the owner and repository names.
 */
export interface OwnerLinkInput {
  owner: string;
  repo: string;
  url?: string;
}

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

export function ownerHref(input: OwnerLinkInput): string {
  try {
    const url = new URL(input.url ?? "");
    if (url.protocol === "https:" && GITHUB_HOSTS.has(url.hostname) && !url.username && !url.password) {
      return url.href;
    }
  } catch {
    // not a URL: fall through to the rebuilt link
  }
  return `https://github.com/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`;
}
