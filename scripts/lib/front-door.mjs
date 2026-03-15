import fs from 'fs';
import path from 'path';

/**
 * Determines if a tool is "Front Door" (customer facing) or "Internal".
 * 
 * Policy:
 * - Internal If:
 *   - `overrides.json` category is "internal"
 *   - `registry.json` tags include "internal"
 * - Front Door If:
 *   - Everything else
 * - Featured If:
 *   - `overrides.json` has `featured: true`
 */
export function getToolStatus(toolId, registryTool, override) {
    const tags = registryTool.tags || [];
    const isInternal = override?.category === 'internal' || tags.includes('internal');
    const isFeatured = !!override?.featured;
    
    return {
        isInternal,
        isFrontDoor: !isInternal,
        isFeatured
    };
}

export function loadRegistry(rootPath) {
    const REGISTRY_PATH = path.join(rootPath, 'site', 'src', 'data', 'registry', 'registry.index.json');
    const OVERRIDES_PATH = path.join(rootPath, 'site', 'src', 'data', 'overrides.json');

    if (!fs.existsSync(REGISTRY_PATH)) {
        throw new Error(`Registry not found at ${REGISTRY_PATH}`);
    }

    let registryText;
    try {
        registryText = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    } catch (err) {
        throw new Error(`Failed to read registry at ${REGISTRY_PATH}: ${err.message}`);
    }

    let registry;
    try {
        registry = JSON.parse(registryText);
    } catch (err) {
        throw new Error(`Failed to parse registry at ${REGISTRY_PATH}: ${err.message}`);
    }

    let overrides = {};
    if (!fs.existsSync(OVERRIDES_PATH)) {
        return { registry, overrides };
    }

    let overridesText;
    try {
        overridesText = fs.readFileSync(OVERRIDES_PATH, 'utf-8');
    } catch (err) {
        throw new Error(`Failed to read overrides at ${OVERRIDES_PATH}: ${err.message}`);
    }

    try {
        overrides = JSON.parse(overridesText);
    } catch (err) {
        throw new Error(`Failed to parse overrides at ${OVERRIDES_PATH}: ${err.message}`);
    }

    return { registry, overrides };
}

/**
 * Finds the local repository path for a tool ID.
 * Returns absolute path or null if not found.
 */
export function findRepoPath(workspaceRoot, id, shopRoot) {
    // 1. Direct match in workspace
    let candidate = path.join(workspaceRoot, id);
    if (fs.existsSync(candidate)) return candidate;

    // 2. mcp- prefix
    candidate = path.join(workspaceRoot, `mcp-${id}`);
    if (fs.existsSync(candidate)) return candidate;

    // 3. accessibility-suite monorepo
    candidate = path.join(workspaceRoot, 'accessibility-suite', 'src', id);
    if (fs.existsSync(candidate)) return candidate;

    // 4. DemumuMind packages
    if (shopRoot) {
        candidate = path.join(shopRoot, 'packages', id);
        if (fs.existsSync(candidate)) return candidate;
    }

    // 5. Attestia packages? (Guesswork based on layout)
    candidate = path.join(workspaceRoot, 'Attestia', 'packages', id);
    if (fs.existsSync(candidate)) return candidate;

    // 6. Try underscore replacement (brain-dev -> dev_brain)
    candidate = path.join(workspaceRoot, id.replace(/-/g, '_'));
    if (fs.existsSync(candidate)) return candidate;

    // 7. Manual overrides / known divergent names
    if (id === 'brain-dev') { 
        candidate = path.join(workspaceRoot, 'dev_brain');
        if (fs.existsSync(candidate)) return candidate;
    }

    return null; 
}
