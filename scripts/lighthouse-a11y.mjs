import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { withStaticPreview } from "./test-server.mjs";

const routes = ["/", "/overview/", "/api/", "/notices/"];
const minScore = 0.9;

await withStaticPreview(async (baseUrl) => {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"]
  });

  try {
    const results = [];
    for (const route of routes) {
      const result = await lighthouse(`${baseUrl}${route}`, {
        port: chrome.port,
        onlyCategories: ["accessibility"],
        logLevel: "error"
      });
      const score = result?.lhr.categories.accessibility.score ?? 0;
      results.push({ route, score: Math.round(score * 100) });
    }

    console.log(JSON.stringify({ minScore: Math.round(minScore * 100), results }, null, 2));

    const failed = results.filter((result) => result.score < minScore * 100);
    if (failed.length > 0) {
      console.error(JSON.stringify({ failed }, null, 2));
      process.exitCode = 1;
    }
  } finally {
    await chrome.kill();
  }
});
