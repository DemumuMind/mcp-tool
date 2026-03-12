export const CATEGORY_META = {
  "mcp-core": {
    title: "MCP Servers",
    description: "Core MCP servers and discovery surfaces that power agent workflows.",
  },
  devtools: {
    title: "Developer Tools",
    description: "CLI tools, editors, testing kits, and workflow helpers for shipping with MCP.",
  },
  infrastructure: {
    title: "Infrastructure",
    description: "Delivery, automation, attestation, orchestration, and platform primitives.",
  },
  desktop: {
    title: "Desktop Apps",
    description: "Desktop clients and local-first control surfaces built for hands-on operator workflows.",
  },
  voice: {
    title: "Voice and Audio",
    description: "Speech, audio, soundboard, and voice-first MCP experiences.",
  },
  security: {
    title: "Security and Verification",
    description: "Security scanners, validation tools, and trust-focused MCP surfaces.",
  },
  web: {
    title: "Web and Browser",
    description: "Browser automation, web analysis, and front-end MCP integrations.",
  },
  ml: {
    title: "AI and ML",
    description: "Training, evaluation, and AI workflow systems adjacent to MCP adoption.",
  },
  games: {
    title: "Interactive Worlds",
    description: "Games, simulations, and experimental interfaces that still expose real tool surfaces.",
  },
} as const;

export const PLATFORM_META = {
  "any-mcp-client": {
    title: "Any MCP Client",
    description: "Servers and tools that can plug into general MCP-ready clients.",
  },
  claude: {
    title: "Claude Ecosystem",
    description: "Tools that explicitly mention Claude, Claude Code, or Claude-adjacent workflows.",
  },
  chatgpt: {
    title: "ChatGPT",
    description: "Hosted MCP products that explicitly support ChatGPT or OpenAI-connected workflows.",
  },
  vscode: {
    title: "VS Code",
    description: "Extensions and tooling built for VS Code-based MCP workflows.",
  },
  cursor: {
    title: "Cursor",
    description: "MCP surfaces that explicitly support Cursor or Cursor-style IDE flows.",
  },
  windsurf: {
    title: "Windsurf",
    description: "MCP products that explicitly target Windsurf agent and IDE workflows.",
  },
  gemini: {
    title: "Gemini",
    description: "MCP products that advertise Gemini support or Gemini-oriented agent workflows.",
  },
  desktop: {
    title: "Desktop Apps",
    description: "Desktop-native apps and local control surfaces.",
  },
  terminal: {
    title: "Terminal",
    description: "CLI tools and terminal-first MCP workflows.",
  },
  web: {
    title: "Web",
    description: "Browser and web delivery surfaces for MCP-compatible tooling.",
  },
} as const;

export const MARKETPLACE_DOCS = [
  {
    slug: "choose-mcp-tools",
    title: "How to choose MCP tools",
    summary: "A practical framework for evaluating MCP tools before you adopt them.",
    eyebrow: "Discovery guide",
    sections: [
      {
        title: "Start from the workflow, not the hype",
        body: [
          "Choose tools by the job they unblock: local coding, browser automation, research, CI, desktop control, or voice workflows.",
          "A strong MCP tool explains its surface clearly and exposes an adoption path quickly.",
        ],
        bullets: [
          "Look for a concrete MCP surface, not a vague AI promise.",
          "Prefer tools with clear docs, installation steps, and recent maintenance signals.",
          "Use platform hubs when your workflow starts from a client like VS Code or Claude.",
        ],
      },
      {
        title: "Use the marketplace signals",
        body: [
          "The catalog emphasizes quality score, verified status, compatibility, and freshness so you can compare options without opening ten tabs first.",
        ],
        bullets: [
          "Quality score favors complete metadata, adoption cues, maintenance, and observable proof.",
          "Automatic verified is algorithmic and explained publicly in Methodology.",
          "Archived tools stay visible, but they are clearly downgraded in ranking and badging.",
        ],
      },
    ],
  },
  {
    slug: "understanding-compatibility",
    title: "Understanding compatibility",
    summary: "How platform hubs, compatibility badges, and runtime hints work across the MCP marketplace.",
    eyebrow: "Compatibility",
    sections: [
      {
        title: "Compatibility is a first-class filter",
        body: [
          "Compatibility is inferred from the product shape, tags, install signals, and platform language found in the source metadata.",
          "That means the catalog can surface useful platform pages even when upstream projects are uneven in how they describe themselves.",
        ],
        bullets: [
          "Any MCP Client is the default hub for general MCP-ready servers.",
          "Specific hubs like Claude, VS Code, Cursor, Desktop, Terminal, and Web are added when the signals are explicit enough.",
        ],
      },
      {
        title: "Treat compatibility as guidance",
        body: [
          "Compatibility signals are transparent hints, not formal certification. Check the dossier links and docs before production rollout.",
        ],
      },
    ],
  },
  {
    slug: "quality-score",
    title: "How quality score works",
    summary: "What lifts a tool in ranking, what drags it down, and why automatic verified is tied to score quality.",
    eyebrow: "Methodology",
    sections: [
      {
        title: "Score inputs",
        body: [
          "Quality score is a weighted blend of documentation, adoption path, maintenance freshness, popularity, trust signals, and product completeness.",
        ],
        bullets: [
          "Documentation and homepage availability matter.",
          "Install guidance, screenshots, and usage fit improve adoption confidence.",
          "Fresh updates and releases matter more than raw stars alone.",
          "Deprecated and sparse tools are penalized heavily.",
        ],
      },
      {
        title: "Automatic verified",
        body: [
          "Verified is automatic in v1. A listing becomes verified only when it clears the score threshold and still satisfies the marketplace minimum bar.",
        ],
      },
    ],
  },
  {
    slug: "submitting-to-the-marketplace",
    title: "Submitting to the marketplace",
    summary: "How GitHub-native submissions, category requests, and ongoing ingestion work in the first release.",
    eyebrow: "Publishing",
    sections: [
      {
        title: "GitHub-native intake",
        body: [
          "The first release uses GitHub-native submission flows. That keeps the pipeline inspectable and avoids inventing a private backend form before it is needed.",
        ],
        bullets: [
          "Submit a tool through the public submission flow.",
          "Request new taxonomy coverage through Request Category.",
          "Auto-publish remains enabled after ingestion and scoring.",
        ],
      },
      {
        title: "Commercial products are allowed",
        body: [
          "A product does not need a public GitHub repository to be listed. Official homepage and documentation are enough if the MCP surface is clear.",
        ],
      },
    ],
  },
] as const;

export const MARKETPLACE_FAQ = [
  {
    slug: "what-counts-as-verified",
    question: "What does Verified mean here?",
    answer:
      "Verified is automatic in this release. It reflects a score threshold plus a valid listing bar, not a paid badge or a hand-reviewed certification program.",
  },
  {
    slug: "can-commercial-products-appear",
    question: "Can commercial MCP products appear in the catalog?",
    answer:
      "Yes. Open-source and commercial products are both valid if they expose a real MCP surface and provide an official homepage or docs.",
  },
  {
    slug: "why-are-archived-tools-still-visible",
    question: "Why are archived or stale tools still visible?",
    answer:
      "The marketplace preserves the ecosystem history, but archived listings are clearly downgraded and excluded from featured, new, and trending sections.",
  },
  {
    slug: "how-are-categories-generated",
    question: "How are categories generated?",
    answer:
      "Categories are automatic in v1. They are derived from source metadata, tool kind, tags, and workflow hints instead of manual editorial placement.",
  },
  {
    slug: "how-do-i-submit-a-tool",
    question: "How do I submit a tool?",
    answer:
      "Use the GitHub-native submit flow. If the category coverage is missing, use Request Category to describe the gap first.",
  },
  {
    slug: "how-should-i-use-the-quality-score",
    question: "Should I trust the quality score alone?",
    answer:
      "No. Use quality score to prioritize attention, then open the dossier and inspect docs, resources, compatibility, and adoption signals directly.",
  },
] as const;
