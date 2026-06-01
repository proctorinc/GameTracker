import { pathToFileURL } from "node:url";

type SearchResult = {
  id: number;
  name: string;
  yearPublished?: number;
};

type ThingImageResult = {
  id: number;
  name: string;
  image?: string;
  thumbnail?: string;
};

type ResolveInput = {
  url?: string;
  name?: string;
  thingId?: number;
};

type ResolveResult = {
  source: "thing-id" | "game-name";
  thingId: number;
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
  matchedPicId?: number;
};

function usage() {
  console.error(
    [
      "Usage:",
      "  node --import tsx scripts/resolve-bgg-image.ts --url <geekdo-url> [--thing-id <id>]",
      "  node --import tsx scripts/resolve-bgg-image.ts --url <geekdo-url> [--name <game name>]",
      "  node --import tsx scripts/resolve-bgg-image.ts --name <game name>",
      "  node --import tsx scripts/resolve-bgg-image.ts --thing-id <id>",
    ].join("\n"),
  );
}

export function parseArgs(argv: string[]): ResolveInput {
  const input: ResolveInput = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--url" && next) {
      input.url = next;
      index += 1;
      continue;
    }

    if (arg === "--name" && next) {
      input.name = next;
      index += 1;
      continue;
    }

    if (arg === "--thing-id" && next) {
      const parsed = Number(next);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid --thing-id value: ${next}`);
      }

      input.thingId = parsed;
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }

    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  return input;
}

export function extractPicIdFromUrl(url: string): number | undefined {
  const match = url.match(/pic(\d+)\.[a-z0-9]+(?:$|\?)/i);
  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}

function decodeXmlText(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function extractTagText(xml: string, tagName: string): string | undefined {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? decodeXmlText(match[1].trim()) : undefined;
}

export function parseThingImage(xml: string): ThingImageResult {
  const itemMatch = xml.match(/<item\b[^>]*id="(\d+)"[^>]*>/i);
  if (!itemMatch) {
    throw new Error("Could not find a BGG <item> in the thing response.");
  }

  const nameMatch = xml.match(
    /<name\b[^>]*type="primary"[^>]*value="([^"]+)"[^>]*\/?>/i,
  );

  return {
    id: Number(itemMatch[1]),
    name: decodeXmlText(nameMatch?.[1] ?? "Unknown"),
    image: extractTagText(xml, "image"),
    thumbnail: extractTagText(xml, "thumbnail"),
  };
}

export function parseSearchResults(xml: string): SearchResult[] {
  const results: SearchResult[] = [];
  const itemPattern = /<item\b([^>]*)>([\s\S]*?)<\/item>/gi;

  for (const match of xml.matchAll(itemPattern)) {
    const attrs = match[1];
    const body = match[2];
    const idMatch = attrs.match(/\bid="(\d+)"/i);
    const nameMatch = body.match(/<name\b[^>]*value="([^"]+)"[^>]*\/?>/i);
    const yearMatch = body.match(/<yearpublished\b[^>]*value="(\d+)"[^>]*\/?>/i);

    if (!idMatch || !nameMatch) {
      continue;
    }

    results.push({
      id: Number(idMatch[1]),
      name: decodeXmlText(nameMatch[1]),
      yearPublished: yearMatch ? Number(yearMatch[1]) : undefined,
    });
  }

  return results;
}

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function scoreNameMatch(query: string, candidate: string) {
  const normalizedQuery = normalizeTitle(query);
  const normalizedCandidate = normalizeTitle(candidate);

  if (normalizedQuery === normalizedCandidate) {
    return 100;
  }

  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return 75;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 50;
  }

  return 0;
}

export function chooseBestSearchResult(
  query: string,
  candidates: SearchResult[],
): SearchResult | undefined {
  return [...candidates]
    .sort((left, right) => {
      const scoreDiff =
        scoreNameMatch(query, right.name) - scoreNameMatch(query, left.name);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      if (left.yearPublished && right.yearPublished) {
        return right.yearPublished - left.yearPublished;
      }

      if (left.yearPublished) {
        return -1;
      }

      if (right.yearPublished) {
        return 1;
      }

      return left.id - right.id;
    })
    .at(0);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "skybo-bgg-image-resolver/1.0",
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

async function fetchThingImage(thingId: number): Promise<ThingImageResult> {
  const xml = await fetchText(
    `https://boardgamegeek.com/xmlapi2/thing?id=${thingId}`,
  );

  return parseThingImage(xml);
}

async function searchThingByName(name: string): Promise<SearchResult[]> {
  const query = encodeURIComponent(name);
  const xml = await fetchText(
    `https://boardgamegeek.com/xmlapi2/search?query=${query}&type=boardgame`,
  );

  return parseSearchResults(xml);
}

export function matchesPicId(
  result: Pick<ThingImageResult, "image" | "thumbnail">,
  picId?: number,
) {
  if (!picId) {
    return true;
  }

  return [result.image, result.thumbnail].some((value) =>
    value?.includes(`pic${picId}.`),
  );
}

async function resolveByThingId(
  thingId: number,
  expectedPicId?: number,
): Promise<ResolveResult> {
  const result = await fetchThingImage(thingId);

  if (!result.image) {
    throw new Error(`BGG thing ${thingId} does not have a primary image.`);
  }

  if (!matchesPicId(result, expectedPicId)) {
    throw new Error(
      `BGG thing ${thingId} resolved, but its image does not match pic${expectedPicId}.`,
    );
  }

  return {
    source: "thing-id",
    thingId: result.id,
    name: result.name,
    imageUrl: result.image,
    thumbnailUrl: result.thumbnail,
    matchedPicId: expectedPicId,
  };
}

async function resolveByGameName(
  name: string,
  expectedPicId?: number,
): Promise<ResolveResult> {
  const candidates = await searchThingByName(name);
  if (candidates.length === 0) {
    throw new Error(`No BGG results found for "${name}".`);
  }

  const orderedCandidates = [...candidates].sort((left, right) => {
    const scoreDiff =
      scoreNameMatch(name, right.name) - scoreNameMatch(name, left.name);

    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return left.id - right.id;
  });

  for (const candidate of orderedCandidates.slice(0, 10)) {
    const thing = await fetchThingImage(candidate.id);
    if (!thing.image) {
      continue;
    }

    if (!matchesPicId(thing, expectedPicId)) {
      continue;
    }

    return {
      source: "game-name",
      thingId: thing.id,
      name: thing.name,
      imageUrl: thing.image,
      thumbnailUrl: thing.thumbnail,
      matchedPicId: expectedPicId,
    };
  }

  const fallback = chooseBestSearchResult(name, candidates);
  if (!fallback) {
    throw new Error(`Could not choose a BGG result for "${name}".`);
  }

  const fallbackThing = await fetchThingImage(fallback.id);
  if (!fallbackThing.image) {
    throw new Error(`Best BGG result for "${name}" does not have a primary image.`);
  }

  if (expectedPicId) {
    throw new Error(
      `Found BGG results for "${name}", but none matched pic${expectedPicId}.`,
    );
  }

  return {
    source: "game-name",
    thingId: fallbackThing.id,
    name: fallbackThing.name,
    imageUrl: fallbackThing.image,
    thumbnailUrl: fallbackThing.thumbnail,
  };
}

export async function resolveBggImage(input: ResolveInput): Promise<ResolveResult> {
  const picId = input.url ? extractPicIdFromUrl(input.url) : undefined;

  if (input.thingId) {
    return resolveByThingId(input.thingId, picId);
  }

  if (input.name) {
    return resolveByGameName(input.name, picId);
  }

  throw new Error(
    "You must provide either --thing-id or --name. A thumbnail URL alone is not enough to reliably resolve the original image.",
  );
}

async function main() {
  const input = parseArgs(process.argv.slice(2));
  const result = await resolveBggImage(input);

  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
