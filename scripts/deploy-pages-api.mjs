import fs from "node:fs/promises";

const API_VERSION = "2022-11-28";
const PAGES_AUDIENCE = "https://pages.github.io";
const SUCCESS_STATES = new Set(["built", "deployed", "succeeded", "success"]);
const FAILURE_STATES = new Set(["errored", "failed", "failure", "canceled"]);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubJson(url, options = {}) {
  const token = required("GITHUB_TOKEN");
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": API_VERSION,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${url}: ${text}`);
  }
  return data;
}

async function getOidcToken() {
  const requestUrl = required("ACTIONS_ID_TOKEN_REQUEST_URL");
  const requestToken = required("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  const separator = requestUrl.includes("?") ? "&" : "?";
  const response = await fetch(`${requestUrl}${separator}audience=${encodeURIComponent(PAGES_AUDIENCE)}`, {
    headers: {
      Authorization: `bearer ${requestToken}`,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OIDC token request failed (${response.status}): ${text}`);
  }
  const data = JSON.parse(text);
  if (!data?.value) throw new Error("OIDC token response did not include a value");
  return data.value;
}

async function findArtifactUrl() {
  const directUrl = process.env.PAGES_ARTIFACT_URL;
  if (directUrl) {
    return directUrl;
  }

  throw new Error("Missing required environment variable: PAGES_ARTIFACT_URL");
}

async function createDeployment({ artifactUrl, oidcToken }) {
  const repo = required("GITHUB_REPOSITORY");
  return githubJson(`https://api.github.com/repos/${repo}/pages/deployments`, {
    method: "POST",
    body: JSON.stringify({
      artifact_url: artifactUrl,
      pages_build_version: required("GITHUB_SHA"),
      oidc_token: oidcToken,
    }),
  });
}

async function waitForDeployment(statusUrl, fallbackPageUrl) {
  const timeoutMs = Number(process.env.PAGES_DEPLOY_TIMEOUT_MS || 600000);
  const intervalMs = Number(process.env.PAGES_DEPLOY_POLL_MS || 5000);
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "unknown";

  while (Date.now() < deadline) {
    const status = await githubJson(statusUrl);
    const state = String(status.status || status.deployment_status || "").toLowerCase();
    lastStatus = state || lastStatus;
    const pageUrl = status.page_url || status.environment_url || fallbackPageUrl || "";

    if (SUCCESS_STATES.has(state)) {
      return pageUrl;
    }
    if (FAILURE_STATES.has(state)) {
      throw new Error(`Pages deployment entered failure state "${state}"`);
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for Pages deployment to finish (last status: ${lastStatus})`);
}

async function writeOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  await fs.appendFile(outputPath, `${name}=${value}\n`, "utf8");
}

async function main() {
  const artifactUrl = await findArtifactUrl();
  const oidcToken = await getOidcToken();
  const deployment = await createDeployment({ artifactUrl, oidcToken });
  const statusUrl = deployment.status_url;
  const pageUrl = await waitForDeployment(statusUrl, deployment.page_url || "");

  if (!pageUrl) {
    throw new Error("Pages deployment finished without returning a page URL");
  }

  await writeOutput("page_url", pageUrl);
  console.log(`Pages deployed: ${pageUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
