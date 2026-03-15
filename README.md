<div align="center">

<img src="logo.png" alt="DemumuMind logo" width="200">

# DemumuMind

**The catalog and promotion engine for tools that AI agents use to get real work done.**

[Live Site](http://localhost:4321/) | [Trust Center](http://localhost:4321/trust/) | [Browse Tools](http://localhost:4321/tools/)

</div>

---

## Who this is for

- **Tool authors** in [DemumuMind](https://github.com/DemumuMind) who want their project listed, promoted, and verified.
- **Journalists and reviewers** looking for press kits with receipt-backed claims. See the [Presskit Handbook](docs/presskit-handbook.md).
- **Other orgs** who want to fork the promotion engine for their own catalog. See [Portable Core](docs/portable-core.md).

**Not for**: End users of individual tools -- go to the [tool pages](http://localhost:4321/tools/) instead.

## 60-Second Quickstart

```bash
git clone https://github.com/DemumuMind/mcp-tool.git
cd mcp-tool/site
npm install
npm run dev          # localhost:4321
```

To add a tool: push a repo to [DemumuMind](https://github.com/DemumuMind), then run Actions > "Sync org metadata". The tool appears on the next deploy.

## Featured Tools

- **[File Compass](https://github.com/DemumuMind/file-compass)** -- Semantic file search with HNSW indexing and local Ollama embeddings. Multi-language AST chunking, <100ms queries over 10K+ files.
- **[Tool Compass](https://github.com/DemumuMind/tool-compass)** -- Find MCP tools by describing what you need. 115+ indexed tools, progressive disclosure pattern.
- **[Soundboard Plugin](https://github.com/DemumuMind/soundboard-plugin)** -- Give Claude Code a voice. 12 voices, emotion-aware speech, multi-speaker dialogue.
- **[Brain-Dev](https://github.com/DemumuMind/brain-dev)** -- MCP server for code analysis: test generation, security audits, health scoring.
- **[Comfy-Headless](https://github.com/DemumuMind/comfy-headless)** -- Headless ComfyUI with prompt intelligence and video generation.

## Proof

Every promotion is backed by receipts, not promises.

- **555 tests** (449 unit + 106 invariant), all passing
- **Zero runtime deps** -- nothing to audit, nothing to break
- **Receipt-verified promotions** -- every promo week has hashed inputs and a commit SHA ([browse receipts](http://localhost:4321/receipts/))
- **Freeze modes** -- automation pauses when frozen; humans must intervene ([Trust Center](http://localhost:4321/trust/))
- **Decision drift detection** -- week-over-week changes are flagged automatically
- **Proven claims** -- MarketIR claims are evidence-backed and independently verifiable ([view proofs](http://localhost:4321/proof/))

Verify any week yourself: visit a [promo page](http://localhost:4321/receipts/), copy the commit SHA, checkout that commit, and compare `sha256sum` on each input file.

Example outputs: [trust receipt](docs/examples/trust-receipt.json) | [drift report](docs/examples/decision-drift.json) | [recommendations](docs/examples/recommendations.json)

## Stack

```
Python | TypeScript | C# | .NET MAUI | WinUI 3
MCP | FastMCP | Ollama | HNSW | CUDA
Windows-first | RTX 5080 | Local-only
```

## Philosophy

Everything runs locally. No cloud dependencies for core functionality. Tools compose through the Model Context Protocol. Append-only where it matters. Accessibility baked in, not bolted on.

*Syntropy above all else.*

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [Quickstart](docs/quickstart.md) | Zero to trust receipt in 5 minutes (npm package) |
| [Handbook](docs/HANDBOOK.md) | How the site works, common tasks, glossary |
| [Presskit Handbook](docs/presskit-handbook.md) | Brand assets, blurbs, verification examples for press |
| [Automation contract](docs/automation.md) | Data ownership, override schema, merge rules |
| [Portable Core](docs/portable-core.md) | Fork the engine for your own org |
| [Security model](docs/SECURITY-MODEL.md) | Threat model, sanitization, CI controls |
| [Ops Runbook](docs/OPS-RUNBOOK.md) | Weekly operations, promotion pipeline, error codes |
| [Contributing](CONTRIBUTING.md) | Local dev setup, testing |

## Security & Data Scope

| Aspect | Detail |
|--------|--------|
| **Data touched** | GitHub org metadata (via API), registry/MarketIR snapshots, tool manifests (JSON), site build output, optional local telemetry export files |
| **Data NOT touched** | No user accounts, no cookies, no remote analytics or third-party tracking services |
| **Permissions** | Read: GitHub API + raw GitHub content for registry/MarketIR sync. Write: site data files, generated artifacts, GitHub PR branches in automation |
| **Network** | GitHub API plus raw GitHub content fetches for registry and MarketIR sync jobs |
| **Telemetry** | No remote telemetry. Optional browser-local event buffer is exported manually from `/lab/telemetry-export/` |

See [SECURITY.md](SECURITY.md) and [docs/SECURITY-MODEL.md](docs/SECURITY-MODEL.md) for full details.

## Scorecard

| Category | Score |
|----------|-------|
| A. Security | 10 |
| B. Error Handling | 10 |
| C. Operator Docs | 10 |
| D. Shipping Hygiene | 10 |
| E. Identity (soft) | 10 |
| **Overall** | **50/50** |

> Full audit: [SHIP_GATE.md](SHIP_GATE.md) | [SCORECARD.md](SCORECARD.md)

## Support

- **Issues**: [github.com/DemumuMind/mcp-tool/issues](https://github.com/DemumuMind/mcp-tool/issues)
- **Trust verification**: [Trust Center](http://localhost:4321/trust/)
- **Press inquiries**: [Presskit Handbook](docs/presskit-handbook.md)

<div align="center">

**[DemumuMind](https://github.com/DemumuMind)** | **[http://localhost:4321/](http://localhost:4321/)**

</div>
