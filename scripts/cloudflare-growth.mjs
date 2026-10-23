import assert from "node:assert/strict";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function periodFor({ start, end, now = new Date() } = {}) {
  const finish = end
    ? new Date(end)
    : new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
  const begin = start
    ? new Date(start)
    : new Date(finish.getTime() - 28 * 86400000);
  assert(
    Number.isFinite(begin.getTime()) && Number.isFinite(finish.getTime()),
    "Invalid date",
  );
  assert(
    begin < finish && finish <= now,
    "Period must be ordered and end no later than now",
  );
  return { start: begin.toISOString(), end: finish.toISOString() };
}
const aiHosts = new Set([
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "www.perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
]);
export function summarizeRum(data, period) {
  assert(
    Array.isArray(data?.pages) && Array.isArray(data?.sources),
    "Analytics result unavailable",
  );
  assert(
    data.pages.length < 10000 && data.sources.length < 10000,
    "Result limit reached; narrow the period before treating it as complete",
  );
  const adapt = (r) => {
    assert(
      Number.isFinite(r.count) &&
        r.count >= 0 &&
        Number.isFinite(r.sum?.visits) &&
        r.sum.visits >= 0,
      "Invalid analytics counts",
    );
    assert(
      Number.isFinite(r.avg?.sampleInterval) && r.avg.sampleInterval >= 1,
      "Missing sampling metadata",
    );
    return {
      estimatedPageLoads: r.count,
      estimatedVisits: r.sum.visits,
      averageSampleInterval: r.avg.sampleInterval,
    };
  };
  const pages = data.pages
    .map((r) => {
      const path = r.dimensions?.requestPath;
      assert(
        typeof path === "string" &&
          path.startsWith("/") &&
          !path.startsWith("//") &&
          !path.includes("\\"),
        "Invalid page path",
      );
      const url = new URL(path, "https://viralasia.co");
      assert.equal(url.origin, "https://viralasia.co");
      return { url: url.href, path, ...adapt(r) };
    })
    .sort((a, b) => b.estimatedPageLoads - a.estimatedPageLoads);
  const referrers = data.sources
    .map((r) => ({ host: r.dimensions?.refererHost ?? "", ...adapt(r) }))
    .sort((a, b) => b.estimatedPageLoads - a.estimatedPageLoads);
  const total = (rows, key) => rows.reduce((s, r) => s + r[key], 0);
  assert.equal(
    total(pages, "estimatedPageLoads"),
    total(referrers, "estimatedPageLoads"),
    "Path/referrer totals differ",
  );
  return {
    status: "available",
    periodStart: period.start,
    periodEndExclusive: period.end,
    estimatedPageLoads: total(pages, "estimatedPageLoads"),
    estimatedVisits: total(pages, "estimatedVisits"),
    maxSampleInterval: Math.max(
      1,
      ...pages.map((x) => x.averageSampleInterval),
      ...referrers.map((x) => x.averageSampleInterval),
    ),
    observedPageGroups: pages.length,
    aiReferralPageLoads: total(
      referrers.filter((r) => aiHosts.has(r.host)),
      "estimatedPageLoads",
    ),
    aiCitations: null,
    googleSearchConsoleClicks: null,
    measurementNote:
      "Cloudflare RUM adaptive sampled estimates, bot=0. Not exact people or Search Console clicks. AI referral hosts do not measure citations. Missing paths have no returned observation, not proven zero traffic. Own visits may be included.",
    pages,
    referrers,
  };
}
const QUERY = `query($accountTag:string,$filter:AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!){viewer{accounts(filter:{accountTag:$accountTag}){pages:rumPageloadEventsAdaptiveGroups(limit:10000,filter:$filter){count sum{visits} avg{sampleInterval} dimensions{requestPath}} sources:rumPageloadEventsAdaptiveGroups(limit:10000,filter:$filter){count sum{visits} avg{sampleInterval} dimensions{refererHost}}}}}`;
export async function collectRum(
  period,
  {
    token = process.env.CLOUDFLARE_API_TOKEN,
    account = process.env.CLOUDFLARE_ACCOUNT_ID,
    fetcher = fetch,
  } = {},
) {
  assert(
    token && account,
    "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required; metrics unavailable",
  );
  const request = async (path, body) => {
    const r = await fetcher("https://api.cloudflare.com/client/v4/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(45000),
    });
    assert(r.ok, `Cloudflare HTTP ${r.status}; metrics unavailable`);
    const d = await r.json();
    assert(
      !d.errors?.length,
      `Cloudflare rejected request: ${(d.errors || [])
        .map((e) => e.message)
        .join("; ")
        .slice(0, 300)}`,
    );
    return d;
  };
  let all = [];
  let page = 1,
    pages = 1;
  do {
    const r = await request(
      `accounts/${encodeURIComponent(account)}/rum/site_info/list?per_page=100&page=${page}`,
    );
    assert(
      Array.isArray(r.result) && r.result_info,
      "Site discovery unavailable",
    );
    all.push(...r.result);
    pages = r.result_info.total_pages;
    assert(
      Number.isInteger(pages) && pages >= 1 && pages <= 100,
      "Invalid site pagination",
    );
    page++;
  } while (page <= pages);
  const sites = all.filter(
    (s) =>
      s.ruleset?.zone_name === "viralasia.co" ||
      s.rules?.some((r) =>
        ["viralasia.co", "www.viralasia.co"].includes(r.host),
      ),
  );
  assert.equal(
    sites.length,
    1,
    "Expected exactly one Viral Asia analytics site",
  );
  const data = await request("graphql", {
    query: QUERY,
    variables: {
      accountTag: account,
      filter: {
        siteTag: sites[0].site_tag,
        requestHost_in: ["viralasia.co", "www.viralasia.co"],
        datetime_geq: period.start,
        datetime_lt: period.end,
        bot: 0,
      },
    },
  });
  const accounts = data.data?.viewer?.accounts;
  assert.equal(accounts?.length, 1, "Analytics account unavailable");
  return { raw: data, report: summarizeRum(accounts[0], period) };
}
async function main() {
  const args = process.argv.slice(2),
    opts = {};
  for (let i = 0; i < args.length; i += 2) {
    assert(
      ["--out", "--start", "--end"].includes(args[i]) && args[i + 1],
      "Use --out DIR [--start ISO --end ISO]",
    );
    opts[args[i].slice(2)] = args[i + 1];
  }
  assert(
    opts.out,
    "--out DIR is required; keep analytics outside the public repository",
  );
  const out = resolve(opts.out);
  await mkdir(out, { recursive: true });
  // These named outputs always describe this run, never a prior successful one.
  for (const name of [
    "cloudflare-raw.json",
    "cloudflare-pages.csv",
    "cloudflare-unavailable.json",
  ])
    await rm(resolve(out, name), { force: true });
  await writeFile(
    resolve(out, "cloudflare-report.json"),
    JSON.stringify(
      { status: "collecting", startedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  try {
    const period = periodFor(opts);
    const { raw, report } = await collectRum(period);
    await writeFile(
      resolve(out, "cloudflare-raw.json"),
      JSON.stringify({ period, ...raw }, null, 2),
    );
    await writeFile(
      resolve(out, "cloudflare-report.json"),
      JSON.stringify(report, null, 2),
    );
    const csv =
      [
        "url,estimated_page_loads,estimated_visits,average_sample_interval",
        ...report.pages.map((r) =>
          [
            JSON.stringify(r.url),
            r.estimatedPageLoads,
            r.estimatedVisits,
            r.averageSampleInterval,
          ].join(","),
        ),
      ].join("\n") + "\n";
    await writeFile(resolve(out, "cloudflare-pages.csv"), csv);
    console.log(
      JSON.stringify(
        {
          status: report.status,
          start: report.periodStart,
          endExclusive: report.periodEndExclusive,
          estimatedPageLoads: report.estimatedPageLoads,
          observedPageGroups: report.observedPageGroups,
          maxSampleInterval: report.maxSampleInterval,
          output: out,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await writeFile(
      resolve(out, "cloudflare-report.json"),
      JSON.stringify({ status: "unavailable", reason: e.message }, null, 2),
    );
    await writeFile(
      resolve(out, "cloudflare-unavailable.json"),
      JSON.stringify({ status: "unavailable", reason: e.message }, null, 2),
    );
    throw e;
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
