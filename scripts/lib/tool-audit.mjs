import path from "node:path";

function defaultAudit() {
  return {
    ci: false,
    build: false,
    readme: false,
    license: false,
    proofs: [],
  };
}

function isEmptyAudit(audit) {
  if (!audit) return true;
  return (
    audit.ci !== true &&
    audit.build !== true &&
    audit.readme !== true &&
    audit.license !== true &&
    (!Array.isArray(audit.proofs) || audit.proofs.length === 0)
  );
}

function auditFromProofEntry(entry) {
  const proofs = Array.isArray(entry?.proofs) ? [...entry.proofs] : [];
  const ci = proofs.includes("ci") || entry?.concept === false || entry?.verified === true;
  const build = entry?.verified === true || proofs.some((proof) => proof !== "ci");

  return {
    ci,
    build,
    readme: false,
    license: false,
    proofs,
  };
}

export function resolveToolAuditPaths(scriptDir) {
  const pathApi = resolveAuditPathModule(scriptDir);
  const shopRoot = pathApi.resolve(scriptDir, "..");
  const workspaceRoot = pathApi.resolve(scriptDir, "../..");
  const dataDir = pathApi.join(shopRoot, "site", "src", "data");

  return {
    workspaceRoot,
    shopRoot,
    dataDir,
    auditDir: pathApi.join(dataDir, "audit"),
    projectsPath: pathApi.join(dataDir, "projects.json"),
    truthMatrixPath: pathApi.join(shopRoot, "audit", "truth-matrix.json"),
    proofsPath: pathApi.join(dataDir, "audit", "proofs.json"),
  };
}

export function resolveAuditPathModule(inputPath) {
  return /^[A-Za-z]:[\\/]/.test(inputPath) ? path.win32 : path;
}

export function buildMatrixProjects({
  projects,
  previousMatrixProjects = [],
  previousProofs = [],
  currentAuditsByRepo = new Map(),
}) {
  const previousByRepo = new Map(previousMatrixProjects.map((project) => [project.path, project]));
  const previousProofsByRepo = new Map(previousProofs.map((entry) => [entry.repo, entry]));

  return projects
    .filter((project) => project.repo)
    .map((project) => {
      const previous = previousByRepo.get(project.repo);
      const previousProof = previousProofsByRepo.get(project.repo);
      const previousAudit = isEmptyAudit(previous?.audit) ? null : previous.audit;
      const audit =
        currentAuditsByRepo.get(project.repo) ||
        (previousProof ? auditFromProofEntry(previousProof) : null) ||
        previousAudit ||
        null;

      if (!audit) return null;

      return {
        name: project.name,
        path: project.repo,
        type: project.kind,
        status: project.stability || "experimental",
        unlisted: !!project.unlisted,
        audit,
      };
    })
    .filter(Boolean);
}

export function buildProofData(matrixProjects) {
  return matrixProjects.map((project) => ({
    repo: project.path,
    proofs: project.audit.proofs,
    verified: project.audit.ci && project.audit.build,
    concept: !project.audit.ci,
  }));
}
