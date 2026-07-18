const baseUrl = (process.argv[2] || "https://viralasia.co").replace(/\/$/, "");

const checks = [];

const addCheck = async (name, fn) => {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, message: error.message });
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const fetchText = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  return { response, text };
};

const fetchManual = (path) =>
  fetch(`${baseUrl}${path}`, { redirect: "manual" });

await addCheck("root renders the content homepage", async () => {
  const { response, text } = await fetchText("/");
  assert(response.ok, `/ returned ${response.status}`);
  assert(
    text.includes('data-emdash-collection="posts"'),
    "/ is missing the content homepage marker",
  );
  assert(
    text.includes("Latest happenings in Singapore"),
    "/ is missing the content homepage title",
  );
  assert(!text.includes("We make"), "/ still looks like the marketing homepage");
});

await addCheck("root navigation points to Engage instead of Blog", async () => {
  const { text } = await fetchText("/");
  assert(text.includes('href="/engage"'), "/ nav is missing /engage");
  assert(!text.includes('href="/blog"'), "/ nav still links to /blog index");
});

await addCheck("engage renders the marketing homepage", async () => {
  const { response, text } = await fetchText("/engage/");
  assert(response.ok, `/engage returned ${response.status}`);
  assert(text.includes("We make"), "/engage is missing marketing hero copy");
  assert(
    text.includes("Singapore's social media agency"),
    "/engage is missing marketing positioning copy",
  );
  assert(
    !text.includes('data-emdash-collection="posts"'),
    "/engage still looks like the content homepage",
  );
});

await addCheck("blog index redirects to root", async () => {
  const response = await fetchManual("/blog");
  assert(
    [301, 302, 307, 308].includes(response.status),
    `/blog returned ${response.status}, expected a redirect`,
  );
  const location = response.headers.get("location") || "";
  assert(location === "/" || location === `${baseUrl}/`, `/blog redirects to ${location}`);
});

await addCheck("blog trailing slash redirects to root", async () => {
  const response = await fetchManual("/blog/");
  assert(
    [301, 302, 307, 308].includes(response.status),
    `/blog/ returned ${response.status}, expected a redirect`,
  );
  const location = response.headers.get("location") || "";
  assert(location === "/" || location === `${baseUrl}/`, `/blog/ redirects to ${location}`);
});

await addCheck("article pages remain available under /blog/slug", async () => {
  const { response, text } = await fetchText(
    "/blog/sgd19-lok-lok-buffet-in-singapore-the-ultimate-late-night-feast/",
  );
  assert(response.ok, `article returned ${response.status}`);
  assert(
    text.includes("$19 Lok Lok Buffet in Singapore"),
    "article page content did not render",
  );
  assert(
    text.includes("https://viralasia.co/blog/sgd19-lok-lok-buffet-in-singapore-the-ultimate-late-night-feast/"),
    "article canonical under /blog/slug is missing",
  );
});

await addCheck("service pages keep marketing logo routing to Engage", async () => {
  const { response, text } = await fetchText("/services/");
  assert(response.ok, `/services returned ${response.status}`);
  assert(
    text.includes('href="/engage"'),
    "/services logo/nav does not include /engage",
  );
});

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
  if (!check.ok) console.log(`  ${check.message}`);
}

if (failed.length > 0) {
  console.error(`\nRoute migration verification failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}

console.log(`\nRoute migration verification passed for ${baseUrl}`);
