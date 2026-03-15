// DemumuMind / mcp-tool ? tool audit generator
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'url';
import { buildMatrixProjects, buildProofData, resolveToolAuditPaths } from "./lib/tool-audit.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  workspaceRoot: WORKSPACE_ROOT,
  shopRoot: SHOP_ROOT,
  dataDir: DATA_DIR,
  auditDir: AUDIT_DIR,
  projectsPath: PROJECTS_PATH,
  truthMatrixPath: TRUTH_MATRIX_PATH,
  proofsPath: PROOFS_PATH,
} = resolveToolAuditPaths(__dirname);

// Ensure directory exists
if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(TRUTH_MATRIX_PATH))) fs.mkdirSync(path.dirname(TRUTH_MATRIX_PATH), { recursive: true });

function globMatch(dir, ext) {
    if (!fs.existsSync(dir)) return false;
    try {
        const files = fs.readdirSync(dir, { recursive: true });
        for (const file of files) {
             const fname = typeof file === 'string' ? file : file.name;
             if (fname.endsWith(ext)) return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

function checkCI(workspaceRoot, repoName) {
    const workflowsDir = path.join(workspaceRoot, ".github", "workflows");
    let found = false;

    // Log for debugging Trace specifically or all
    if (repoName.toLowerCase().includes("trace")) console.log(`[DEBUG] Checking CI for ${repoName} in ${workflowsDir}`);

    // 1. Check root workflows
    if (fs.existsSync(workflowsDir)) {
        try {
            const files = fs.readdirSync(workflowsDir);
            if (repoName.toLowerCase().includes("trace")) console.log(`[DEBUG] Found ${files.length} workflows: ${files.join(", ")}`);
            for (const file of files) {
                // if (repoName.toLowerCase().includes("trace")) console.log(`[DEBUG] Checking file ${file} for ${repoName}`);
                const fullPath = path.join(workflowsDir, file);
                const content = fs.readFileSync(fullPath, "utf8");
                
                // Heuristics
                if (content.includes(`paths:\n      - '${repoName}/**'`) || 
                    content.includes(`paths:\n      - "${repoName}/**"`) ||
                    content.includes(`working-directory: ${repoName}`) ||
                    content.includes(`working-directory: ./${repoName}`) ||
                    content.includes(`working-directory: '${repoName}'`)) {
                    found = true;
                    console.log(`[DEBUG] Found CI via content match in ${file} for ${repoName}`);
                    break;
                }
                
                // Matches filename like trace.yml for repo Trace
                if (file.toLowerCase().includes(repoName.toLowerCase()) && !file.includes("audit")) {
                    found = true;
                    console.log(`[DEBUG] Found CI via filename match in ${file} for ${repoName}`);
                    break;
                }
            }
        } catch (e) {
            if (repoName === "Trace") console.error(`Error reading workflows: ${e}`);
        }
    } else {
        if (repoName === "Trace") console.log(`Workflows dir not found: ${workflowsDir}`);
    }
    
    if (found) return true;

    // 2. Check local workflows
    const localWorkflows = path.join(workspaceRoot, repoName, ".github", "workflows");
    if (fs.existsSync(localWorkflows)) {
        try {
             if (fs.readdirSync(localWorkflows).length > 0) return true;
        } catch {}
    }

    return false;
}

async function main() {
  const projects = JSON.parse(fs.readFileSync(PROJECTS_PATH, "utf8"));
  const currentAuditsByRepo = new Map();
  
  const matrix = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    projects: []
  };

  console.log(`Auditing ${projects.length} tools for Truth Maintenance...`);

  for (const p of projects) {
    // Skip unlisted or non-repo entries if desired, but user wants audit.
    if (!p.repo) continue;

    const projectPath = path.join(WORKSPACE_ROOT, p.repo);
    if (p.repo.toLowerCase().includes("trace")) console.log(`[DEBUG] Trace path: ${projectPath}`);
    
    const audit = {
      ci: false,
      build: false,
      readme: false,
      license: false,
      proofs: []
    };

    // 1. Reality Check: Filesystem
    const exists = fs.existsSync(projectPath);
    if (exists) {
        // License
        if (fs.existsSync(path.join(projectPath, "LICENSE")) || fs.existsSync(path.join(projectPath, "LICENSE.md"))) {
            audit.license = true;
        }
        
        // README
        if (fs.existsSync(path.join(projectPath, "README.md"))) {
            audit.readme = true;
        }

        // Build System
        const hasPackageJson = fs.existsSync(path.join(projectPath, "package.json"));
        // globMatch is expensive if deep, restrict? No, allow standard depth.
        const hasCsproj = globMatch(projectPath, ".csproj") || globMatch(projectPath, ".sln");
        const hasPyProject = fs.existsSync(path.join(projectPath, "pyproject.toml")) || fs.existsSync(path.join(projectPath, "requirements.txt"));
        const hasPom = fs.existsSync(path.join(projectPath, "pom.xml"));
        const hasCargo = fs.existsSync(path.join(projectPath, "Cargo.toml"));

        if (hasPackageJson) { audit.build = true; audit.proofs.push("npm"); }
        if (hasCsproj) { audit.build = true; audit.proofs.push("dotnet"); }
        if (hasPyProject) { audit.build = true; audit.proofs.push("python"); }
        if (hasPom) { audit.build = true; audit.proofs.push("maven"); }
        if (hasCargo) { audit.build = true; audit.proofs.push("cargo"); }

        // CI Check
        if (checkCI(WORKSPACE_ROOT, p.repo)) {
            audit.ci = true;
            audit.proofs.push("ci");
        }
        currentAuditsByRepo.set(p.repo, audit);
    }
  }

  const previousProofs = fs.existsSync(PROOFS_PATH)
    ? JSON.parse(fs.readFileSync(PROOFS_PATH, "utf8"))
    : [];

  matrix.projects = buildMatrixProjects({
    projects,
    currentAuditsByRepo,
  });

  const proofProjects = buildMatrixProjects({
    projects,
    previousProofs,
    currentAuditsByRepo,
  });

  // Write truth matrix
  fs.writeFileSync(TRUTH_MATRIX_PATH, JSON.stringify(matrix, null, 2));
  console.log(`Wrote truth matrix to ${TRUTH_MATRIX_PATH}`);

  // Write proof pills for UI
  const proofData = buildProofData(proofProjects);
  
  fs.writeFileSync(PROOFS_PATH, JSON.stringify(proofData, null, 2));
  console.log(`Wrote proofs to ${PROOFS_PATH}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
