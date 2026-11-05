const project = process.argv[2];
const environment = process.env.VERCEL_ENV;

function skipBuild(message) {
  console.log(`Skipping Vercel build: ${message}`);
  process.exit(0);
}

function allowBuild(message) {
  console.log(`Running Vercel build: ${message}`);
  process.exit(1);
}

if (project !== "admin" && project !== "storefront") {
  allowBuild(`unknown project kind ${project || "<empty>"}`);
}

if (project === "storefront" && environment === "production") {
  skipBuild("Hostinger serves customer storefront production");
}

const owner = process.env.VERCEL_GIT_REPO_OWNER || "fatalmonk";
const repo = process.env.VERCEL_GIT_REPO_SLUG || "luckystorePOS";
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;
const branch = process.env.VERCEL_GIT_COMMIT_REF;
const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;

if (!commitSha || !branch) {
  allowBuild("Vercel Git commit metadata is unavailable");
}

const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
const headers = {
  accept: "application/vnd.github+json",
  "user-agent": "luckystore-vercel-ignored-build-step",
};

async function getJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status}`);
  }
  return response.json();
}

try {
  let baseSha = previousSha;

  if (!baseSha && branch === "main") {
    const commit = await getJson(`${api}/commits/${encodeURIComponent(commitSha)}`);
    baseSha = commit.parents?.[0]?.sha;
  } else if (!baseSha) {
    baseSha = "main";
  }

  if (!baseSha) {
    allowBuild("no base commit is available for comparison");
  }

  const comparison = await getJson(
    `${api}/compare/${encodeURIComponent(baseSha)}...${encodeURIComponent(commitSha)}`,
  );

  // GitHub truncates large comparisons. Build conservatively rather than risk
  // skipping a relevant change when the full file list is unavailable.
  if (
    !Array.isArray(comparison.files) ||
    comparison.total_commits >= 250 ||
    comparison.files.length >= 300 ||
    comparison.status === "diverged"
  ) {
    allowBuild("the GitHub comparison is incomplete or divergent");
  }

  const changedPaths = comparison.files.flatMap((file) =>
    file.previous_filename ? [file.filename, file.previous_filename] : [file.filename],
  );
  const appPath = project === "admin" ? "apps/admin_web/" : "apps/customer_storefront/";
  const sharedInputs = new Set([
    "package.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
    ".npmrc",
    "tsconfig.json",
    "vercel.json",
    ".vercelignore",
  ]);

  const isMarkdown = (path) => /\.(md|mdx)$/i.test(path);
  const isSharedPackage = (path) => path.startsWith("packages/");
  const isAdminInput = (path) =>
    path.startsWith("landing/") && /\.html$/i.test(path);
  const isRelevant = (path) => {
    if (isMarkdown(path)) return false;
    if (path.startsWith(appPath) || sharedInputs.has(path) || isSharedPackage(path)) return true;
    return project === "admin" && isAdminInput(path);
  };

  const relevantPaths = changedPaths.filter(isRelevant);
  if (relevantPaths.length > 0) {
    console.log(`Relevant ${project} inputs changed: ${relevantPaths.join(", ")}`);
    allowBuild("runtime inputs changed");
  }

  skipBuild("no relevant app inputs changed");
} catch (error) {
  allowBuild(`could not determine changed files (${error.message})`);
}
