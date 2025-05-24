export async function getFileSha(octokit, owner, repo, branch, filePath) {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref: branch,
  });
  return data.sha;
} 