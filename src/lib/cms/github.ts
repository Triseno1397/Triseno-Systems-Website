import { Octokit } from "@octokit/rest";

/**
 * Commits content to GitHub. Vercel's GitHub integration takes it from there.
 *
 * Uses the Git Data API, not the Contents API. The Contents API writes one file per
 * call, and each call is its own commit — so publishing three changed files would
 * produce three commits and three Vercel builds, and two concurrent publishes could
 * interleave into a broken tree. The Git Data API builds a tree and lands everything
 * in a single commit:
 *
 *   blobs → tree → commit → PATCH ref
 *
 * The final PATCH is the concurrency control: it names the parent SHA we started from,
 * so if anything else pushed to main in the meantime it fails rather than clobbering.
 * That is exactly the behaviour we want — retry from a fresh head.
 */

const OWNER = "Triseno1397";
const REPO = "Triseno-Systems-Website";
const BRANCH = "main";

export type FileChange = { path: string; content: string };

export type PublishResult = {
  commitSha: string;
  url: string;
  changed: string[];
};

function client(): Octokit {
  const auth = process.env.GITHUB_TOKEN;
  if (!auth) throw new Error("GITHUB_TOKEN is not set");
  return new Octokit({ auth });
}

/** Current content of a file on main, or null if it doesn't exist. */
export async function readFile(path: string): Promise<string | null> {
  const octokit = client();
  try {
    const res = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
      ref: BRANCH,
    });
    if (!("content" in res.data) || Array.isArray(res.data)) return null;
    return Buffer.from(res.data.content, "base64").toString("utf8");
  } catch (err: unknown) {
    if (typeof err === "object" && err && "status" in err && err.status === 404) return null;
    throw err;
  }
}

/**
 * Commit `files` to main in one commit. Skips files whose content is unchanged, so a
 * no-op publish stays a no-op instead of spending a Vercel build on nothing.
 */
export async function commitFiles(
  files: FileChange[],
  message: string
): Promise<PublishResult | { noop: true }> {
  const octokit = client();

  // Drop unchanged files.
  const changed: FileChange[] = [];
  for (const file of files) {
    const current = await readFile(file.path);
    if (current !== file.content) changed.push(file);
  }
  if (changed.length === 0) return { noop: true };

  // 1. Where is main right now?
  const ref = await octokit.rest.git.getRef({
    owner: OWNER,
    repo: REPO,
    ref: `heads/${BRANCH}`,
  });
  const baseSha = ref.data.object.sha;

  const baseCommit = await octokit.rest.git.getCommit({
    owner: OWNER,
    repo: REPO,
    commit_sha: baseSha,
  });

  // 2. One blob per changed file.
  const blobs = await Promise.all(
    changed.map(async (file) => {
      const blob = await octokit.rest.git.createBlob({
        owner: OWNER,
        repo: REPO,
        content: Buffer.from(file.content, "utf8").toString("base64"),
        encoding: "base64",
      });
      return { path: file.path, sha: blob.data.sha };
    })
  );

  // 3. A tree layered on top of the current one.
  const tree = await octokit.rest.git.createTree({
    owner: OWNER,
    repo: REPO,
    base_tree: baseCommit.data.tree.sha,
    tree: blobs.map((b) => ({
      path: b.path,
      mode: "100644",
      type: "blob",
      sha: b.sha,
    })),
  });

  // 4. The commit.
  const commit = await octokit.rest.git.createCommit({
    owner: OWNER,
    repo: REPO,
    message,
    tree: tree.data.sha,
    parents: [baseSha],
    author: {
      name: "Triseno CMS",
      email: "cms@trisenosystems.com",
      date: new Date().toISOString(),
    },
  });

  // 5. Move main. force:false → fails if someone pushed while we were working.
  await octokit.rest.git.updateRef({
    owner: OWNER,
    repo: REPO,
    ref: `heads/${BRANCH}`,
    sha: commit.data.sha,
    force: false,
  });

  return {
    commitSha: commit.data.sha,
    url: `https://github.com/${OWNER}/${REPO}/commit/${commit.data.sha}`,
    changed: changed.map((c) => c.path),
  };
}
