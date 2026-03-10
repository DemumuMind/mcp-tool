# End-to-End RCA Audit

Дата: 2026-03-10

## Краткий вывод

Система в текущем состоянии не является классическим multi-service runtime. По факту это:

- статический Astro frontend;
- набор Node.js генераторов и ingest-скриптов;
- GitHub Actions как orchestration/control plane;
- JSON-артефакты в `site/src/data/` как pseudo-DB;
- `promo-queue.json` как queue;
- `.gen-cache`, `site/src/data/target-cache` и Actions cache как cache layer;
- `trust.json`, `ops-history.json`, `queue-health.json`, `_build.json`, browser-local telemetry export и GitHub Actions UI как observability surfaces.

Главная подтверждённая техническая первопричина инцидентного класса: публичный host/canonical слой закодирован как `localhost`, и это значение размножено через frontend, generators, smoke, robots, sitemap, CNAME и тесты. В результате система одновременно:

- генерирует неверные canonical/public URLs;
- бьёт smoke не в live site, а в `https://localhost:4321`;
- закрепляет дефект unit-тестами как ожидаемое поведение;
- не имеет достаточных guardrails, чтобы это поймать до deploy.

Дополнительно подтверждены ещё пять системных дефектов: silent loss distribution signals, partial-state promotion, stale generator cache, overwrite-only MarketIR sync и отсутствие единого timeout/retry стандарта для network fetchers.

## Область аудита и метод

Проверены два контура:

- `repo/static`: код, конфиги, GitHub workflows, build artifacts, tests, data contracts.
- `live runtime`: публично доступные GitHub Actions pages, предполагаемые GitHub Pages endpoints, browser/runtime checks на собранном `site/dist`.

Базовые команды и результаты:

- `npm run test:all` -> `607` тестов, `0` fail.
- `npm --prefix site run build` -> сборка успешна, `171` страниц.
- `node scripts/smoke-test.mjs` -> `44 failed` из `45` проверок, почти всё падает с `fetch failed`, потому что default base = `https://localhost:4321`.
- `node scripts/fetch-distribution-signals.mjs` -> `No links found. Run gen-links.mjs first.` при отсутствии `site/src/data/links.json`.

Live/runtime checks:

- локально поднятый `site/dist` показал `canonical=http://localhost:4321/` и `og:url=http://localhost:4321/`;
- `https://demumumind.github.io/` и `https://demumumind.github.io/mcp-tool/` возвращают `404`;
- публичная страница GitHub Actions показывает `0 workflow runs` для `pages.yml`, `targets-weekly.yml`, `nameops-scheduled.yml`;
- GitHub REST endpoints для Pages/settings и Actions runs без auth вернули `403`, поэтому privileged runtime details остались недоступны.

## Архитектура и проверенные слои

### Frontend

- Astro static site в `site/`.
- Canonical/OG/meta строятся через `site/src/layouts/Base.astro`.
- Dynamic server/API routes не обнаружены: `site/src/pages/api` отсутствует.

### Backend / API contracts

- Реального runtime backend API нет.
- Фактические API-контракты системы:
  - `workflow_dispatch` inputs в GitHub Actions;
  - JSON contracts в `site/src/data/*.json`;
  - генераторы, пишущие `site/public/**` и `site/src/data/**`.

### DB / Queue / Cache

- SQL/NoSQL БД не обнаружена.
- Message broker не обнаружен.
- Queue роль выполняет `site/src/data/promo-queue.json`.
- Cache роль выполняют `.gen-cache`, `site/src/data/target-cache`, GitHub Actions cache.

### Proxy / Containers / Environments

- Docker/Compose/Nginx/Caddy/Netlify/Vercel config в репозитории не обнаружены.
- GitHub Actions выступает как основной execution environment.
- Public deploy path по репозиторию целится в GitHub Pages, но live evidence этого deploy path неполный.

### Observability / Auth / CORS

- Observability ограничена файлами `trust.json`, `ops-history.json`, `queue-health.json`, `recommendations.json`, `_build.json`, GitHub Actions UI и browser-local telemetry export.
- Repo docs и code path подтверждают отсутствие user auth/sessions и динамических API, поэтому CORS/auth в классическом смысле не применяются.
- Полная runtime header verification на production невозможна без подтверждённого live endpoint.

## Findings

### F-01 | High | Confirmed
### Публичный host/canonical слой закодирован как `localhost`

- Симптом:
  - canonical/OG/sitemap/robots/CNAME указывают на `localhost`;
  - smoke после deploy по умолчанию бьёт в `https://localhost:4321`;
  - публичные генераторы создают ссылки на `localhost`.
- Затронутые компоненты:
  - `kit.config.json:10`
  - `site/astro.config.mjs:7-15`
  - `site/src/layouts/Base.astro:68-70,106-110`
  - `site/public/CNAME:1`
  - `site/public/robots.txt:4`
  - `scripts/smoke-test.mjs:4,14`
  - `scripts/gen-links.mjs:46,52,169`
  - `scripts/gen-presskit.mjs:134-135`
  - `scripts/gen-outreach-packs.mjs`, `scripts/gen-targets.mjs`, `scripts/gen-promo.mjs`, `scripts/gen-outreach-run.mjs`
- Где возникает проблема:
  - source of truth для site base URL задан как `http://localhost:4321/`.
- Как распространяется:
  - `kit.config.json` -> `astro.config`/`Base.astro` -> canonical/meta/sitemap/robots/CNAME
  - `kit.config`/hardcoded strings -> generators -> presskit/go-links/outreach/targets
  - `pages.yml` -> `smoke-test.mjs` -> runtime probe в `https://localhost:4321`
- Техническая первопричина:
  - production host не отделён от local dev host, а `localhost` принят как canonical public base URL.
- Доказательства:
  - `site/dist/index.html` содержит `<link rel="canonical" href="http://localhost:4321/">`.
  - `site/dist/sitemap-index.xml` содержит `http://localhost:4321/sitemap-0.xml`.
  - Playwright evaluation на собранном `site/dist` вернул:
    - `canonical = http://localhost:4321/`
    - `ogUrl = http://localhost:4321/`
  - `node scripts/smoke-test.mjs` падает на `44/45` checks.
- Критичность:
  - `High`.
- Влияние:
  - битые canonical URLs и sitemap;
  - невалидные публичные ссылки в generated assets;
  - ложные smoke failures;
  - SEO/verification/public trust surface не соответствует intended deploy target.
- Воспроизведение:
  - `npm --prefix site run build`
  - открыть `site/dist/index.html` и `site/dist/sitemap-index.xml`
  - `node scripts/smoke-test.mjs`
- Исправление:
  - ввести единый production-safe source of truth для public base URL;
  - убрать hardcoded `localhost` из generators, smoke, CNAME, robots, sitemap, tests;
  - передавать live `page_url` в smoke job.
- Риски:
  - исправление затронет все generated URLs и snapshot-like tests;
  - нужен controlled rollout, чтобы не сломать уже опубликованные ссылки и docs.

### F-02 | Medium | Confirmed
### Guardrails не ловят host/canonical дефект и частично закрепляют его как норму

- Симптом:
  - тесты и build проходят, хотя public URL слой сломан.
- Затронутые компоненты:
  - `tests/unit/rebrand-branding.test.mjs:18`
  - `.github/workflows/site-quality.yml:4-12`
  - `.github/workflows/site-quality.yml:172-229`
  - `.github/workflows/pages.yml:35-58,81-82`
- Где возникает проблема:
  - в quality gate scope и assertions.
- Как распространяется:
  - изменения в `kit.config.json`, `CNAME`, deploy semantics и absolute self-links могут не попасть в нужный gate;
  - даже попав в unit tests, дефект считается expected behavior.
- Техническая первопричина:
  - guardrails валидируют частные свойства build output, но не public host correctness как инвариант.
- Доказательства:
  - unit test прямо утверждает `config.site.url === "http://localhost:4321/"`.
  - path filter `site-quality.yml` не включает `kit.config.json`, `site/public/CNAME`, `pages.yml`.
  - link checker ищет только `href="/..."`, а absolute self-links вроде `https://localhost:4321/...` не анализирует.
  - `pages.yml` не запускает `npm test` и `npm run test:invariants`.
- Критичность:
  - `Medium`.
- Влияние:
  - дефект уходит в green CI/build;
  - deploy pipeline и quality pipeline расходятся по критериям истины.
- Воспроизведение:
  - `npm run test:all` проходит;
  - `node scripts/smoke-test.mjs` падает;
  - `site/dist/index.html` всё ещё содержит `localhost`.
- Исправление:
  - добавить invariant `production canonical host != localhost`;
  - расширить path filters;
  - добавить absolute self-link checks;
  - запускать tests/invariants в deploy path до upload/deploy.
- Риски:
  - после исправления сразу всплывут существующие latent defects в docs/generators.

### F-03 | High | Confirmed
### Weekly target discovery тихо теряет distribution signals

- Симптом:
  - scoring в `gen-targets` может системно терять `signalBonus`, не останавливая workflow.
- Затронутые компоненты:
  - `.github/workflows/targets-weekly.yml:42-51`
  - `scripts/fetch-distribution-signals.mjs:68-71`
  - `scripts/gen-targets.mjs:224-246,528-530`
- Где возникает проблема:
  - workflow dependency ordering.
- Как распространяется:
  - `targets-weekly.yml` запускает `fetch-distribution-signals` без `gen-links.mjs`
  - скрипт падает на отсутствии `site/src/data/links.json`
  - `continue-on-error: true` скрывает это
  - `gen-targets.mjs` молча работает без `signalOrgs`
  - итоговый ranking теряет часть сигналов и меняет order/scoring.
- Техническая первопричина:
  - broken dependency chain плюс explicit suppression of failure.
- Доказательства:
  - локально: `links_exists=false`
  - `node scripts/fetch-distribution-signals.mjs` -> `No links found. Run gen-links.mjs first.`
  - `gen-targets.mjs` грузит signals в `try { ... } catch {}` и даёт `signalBonus` только при наличии `signal:*`.
- Критичность:
  - `High`.
- Влияние:
  - target discovery выдаёт системно деградированный результат без явного incident signal.
- Воспроизведение:
  - удалить/не генерировать `site/src/data/links.json`
  - запустить `node scripts/fetch-distribution-signals.mjs`
  - затем `node scripts/gen-targets.mjs --dry-run`
- Исправление:
  - генерировать links до distribution signals;
  - убрать `continue-on-error` для критичной dependency;
  - логировать empty-signal state как warning/error, а не silently optional path.
- Риски:
  - после фикса ranking изменится; понадобится baseline comparison.

### F-04 | High | Confirmed
### Promotion pipeline публикует partial state даже при падении генераторов

- Симптом:
  - slug может стать `featured=true`, хотя часть обязательных артефактов для него не сгенерирована.
- Затронутые компоненты:
  - `scripts/gen-promo.mjs:222-275`
- Где возникает проблема:
  - state mutation после channel execution.
- Как распространяется:
  - любой fail в `presskit` / `snippets` / `campaigns`
  - `results.push({ ok: false })`
  - затем код всё равно выставляет `overrides[slug].featured = true`
  - process завершается с error, но JSON state уже изменён.
- Техническая первопричина:
  - изменение publish-state не связано с success criteria генерации.
- Доказательства:
  - `results` сохраняет `ok`;
  - блок `Update featured flags` не проверяет aggregate success по slug.
- Критичность:
  - `High`.
- Влияние:
  - сайт и generated artifacts могут расходиться;
  - operator видит featured slug, для которого bundle/presskit/snippets отсутствуют или неполны.
- Воспроизведение:
  - поставить slug с падающим generator path или невалидным channel config;
  - запустить `gen-promo.mjs`;
  - увидеть, что `featured` меняется до `process.exit(1)`.
- Исправление:
  - обновлять `featured` только если все required channels для slug завершились успешно;
  - при fail делать rollback или staged write в temp artifact/state.
- Риски:
  - existing operational assumptions о "best effort" promotion придётся уточнить.

### F-05 | Medium | Confirmed
### Generator cache в NameOps pipeline может обслуживать устаревшие артефакты после изменения кода

- Симптом:
  - generator logic меняется, а outputs могут не пересобраться.
- Затронутые компоненты:
  - `.github/workflows/nameops-scheduled.yml:111-192`
- Где возникает проблема:
  - cache key design.
- Как распространяется:
  - input hash считается только по data files;
  - code changes в `scripts/*.mjs` не меняют cache key;
  - `cache-hit` пропускает почти все generator steps;
  - stale outputs продолжают использоваться.
- Техническая первопричина:
  - cache key зависит от data state, но не зависит от generator code version.
- Доказательства:
  - key = `gen-outputs-${{ steps.input_hash.outputs.hash }}`
  - hash строится из `site/src/data/**`, но не из `scripts/**`, commit SHA или package version.
- Критичность:
  - `Medium`.
- Влияние:
  - CI и site artifacts могут расходиться с текущей версией business logic.
- Воспроизведение:
  - изменить generator code, не меняя hashed inputs;
  - cache key останется прежним.
- Исправление:
  - включить в key commit SHA, script hash или version manifest.
- Риски:
  - после исправления вырастет build cost и cache churn.

### F-06 | Medium | Confirmed
### MarketIR ingest overwrite-only и не очищает удалённые upstream файлы

- Симптом:
  - stale MarketIR/tool/evidence files могут продолжать участвовать в downstream расчётах.
- Затронутые компоненты:
  - `scripts/fetch-marketir.mjs:163-209`
  - `scripts/gen-trust-receipt.mjs:95-103`
- Где возникает проблема:
  - ingest reconciliation phase отсутствует.
- Как распространяется:
  - upstream удаляет или переименовывает tool JSON;
  - локальный sync просто перезаписывает fetched subset;
  - stale files остаются на диске;
  - downstream consumers читают весь каталог как canonical state.
- Техническая первопричина:
  - consumer logic считает directory listing truth source, а ingest не поддерживает delete/reconcile semantics.
- Доказательства:
  - `fetch-marketir.mjs` только пишет fetched files и snapshot;
  - `gen-trust-receipt.mjs` считает `provenClaims` обходом всех `marketir/data/tools/*.json`.
- Критичность:
  - `Medium`.
- Влияние:
  - trust metrics и evidence-derived summaries могут drift'ить от upstream truth.
- Воспроизведение:
  - синхронизировать каталог;
  - удалить файл upstream без локальной cleanup phase;
  - rerun ingest;
  - stale local file останется.
- Исправление:
  - reconciliation по manifest/lock;
  - explicit cleanup phase для отсутствующих путей.
- Риски:
  - cleanup phase должна быть manifest-driven, иначе можно удалить локальные нужные артефакты ошибочно.

### F-07 | Medium | Hypothesis
### Network fetchers не стандартизованы по timeout/retry/backoff

- Симптом:
  - transient stalls/403/slow raw-content requests могут приводить к flaky ingest/build behavior.
- Затронутые компоненты:
  - `scripts/fetch-marketir.mjs:56,68`
  - `scripts/fetch-github-facts.mjs:42-54`
  - `scripts/sync-org-metadata.mjs:49-80`
  - `scripts/fetch-distribution-signals.mjs:51-63`
- Где возникает проблема:
  - network client layer.
- Как распространяется:
  - bare `fetch(url, { headers })`
  - без `AbortController`, без bounded timeout, без retry/backoff
  - job hangs/fails неравномерно по скриптам.
- Техническая первопричина:
  - отсутствует единый resilience standard для networked scripts.
- Доказательства:
  - перечисленные скрипты используют bare `fetch`;
  - в репозитории есть контрпример `scripts/gen-readme-health.mjs`, где timeout/retry уже реализованы.
- Критичность:
  - `Medium`.
- Влияние:
  - риск intermittent CI/build instability.
- Воспроизведение:
  - в текущем pass не воспроизведено как живой сбой;
  - поэтому статус остаётся `Hypothesis`.
- Исправление:
  - общий helper с timeout + retry + backoff + typed error classification.
- Риски:
  - чрезмерный retry может ухудшить rate-limit behavior, если не будет bounded policy.

## Live contour: подтверждённые ограничения и gaps

- Public GitHub Actions page доступна и показала:
  - `11 workflow runs` overall;
  - `0 workflow runs` для `pages.yml`;
  - `0 workflow runs` для `targets-weekly.yml`;
  - `0 workflow runs` для `nameops-scheduled.yml`.
- `https://demumumind.github.io/` и `https://demumumind.github.io/mcp-tool/` на момент проверки возвращали `404`.
- GitHub REST `repos/DemumuMind/mcp-tool/pages` и `actions/runs` без auth вернули `403`.

Вывод:

- live runtime evidence частично доступен через public GitHub UI;
- privileged deploy/log/platform evidence недоступен без auth;
- отсутствие live deploy не доказано окончательно, но public fallback GitHub Pages endpoint недоступен, а workflow page для `pages.yml` не показывает запусков.

## Что было проверено и признано отсутствующим

Подтверждено по repo/static evidence:

- нет runtime backend API;
- нет user auth/session layer;
- нет CORS-sensitive API surface;
- нет SQL/NoSQL DB config;
- нет message broker;
- нет container orchestration / Docker / Compose / Nginx / Caddy;
- нет reverse proxy config в репозитории.

Доказательства:

- `site/src/pages/api` отсутствует;
- repo search не выявил server/auth/db/broker implementation surfaces;
- `docs/SECURITY-MODEL.md` прямо фиксирует: no auth/sessions, no databases, no dynamic API endpoints;
- Docker/proxy infra files не найдены.

## Что реально использовано

### Skills / Навыки

- `using-superpowers`
- `brainstorming`
- `writing-plans`
- `search-first`
- `systematic-debugging`
- `dispatching-parallel-agents`
- `superpowers-subagent-prompts`
- `security-review`
- `playwright`
- `e2e-testing`

### MCP / инструменты

- `Playwright MCP`
- `spawn_agent`
- `list_mcp_resources`
- `list_mcp_resource_templates`
- shell-команды через `exec_command`
- web lookup attempts

### Subagents

- `Helmholtz` — CI/CD and deploy pass, результат использован.
- `Pasteur` — generators/data pass, результат использован.
- `Kepler` — frontend pass вернул некорректно оформленный частичный ответ; как источник доказательств не использовался.

### Browser/runtime checks

- локальный browser pass по `site/dist` через HTTP server + Playwright snapshot/evaluate;
- публичный GitHub Actions UI pass через Playwright;
- public endpoint probes через `Invoke-WebRequest`.

## Что было недоступно

- MCP resources/templates: discovery вернул пустые списки.
- Automations: `CODEX_HOME` не задан, каталог automations отсутствует.
- GitHub Pages settings/runtime details через public REST API: `403` без auth.
- Private logs, secrets, internal observability, privileged runtime env и non-public headers.
- Подтверждённый production custom domain / final public site URL.

## Подтверждено vs гипотезы

### Confirmed

- F-01: public host/canonical layer wired to `localhost`
- F-02: guardrails do not catch and partly codify the defect
- F-03: target discovery silently loses distribution signals
- F-04: promotion pipeline mutates featured state on failed generation
- F-05: generator cache key ignores generator code version
- F-06: MarketIR ingest is overwrite-only and can leave stale truth inputs

### Hypotheses

- F-07: absence of standardized timeout/retry/backoff is causing or will cause transient ingest/build failures

### Not enough evidence to confirm

- точный production public URL для live frontend;
- факт существования или отсутствия отдельного non-GitHub Pages deploy path;
- полный runtime headers/redirect chain production edge.

## Minimal-risk remediation order

1. Исправить public base URL source of truth и убрать `localhost` из canonical/generators/smoke/tests/CNAME/robots.
2. Синхронизировать guardrails: path filters, invariants, absolute self-link checks, deploy prechecks.
3. Починить `targets-weekly.yml` dependency order и убрать silent error suppression.
4. Сделать `gen-promo.mjs` success-gated по slug/channel и убрать partial-state mutation.
5. Включить generator code/version в cache key.
6. Добавить manifest-based reconciliation cleanup в MarketIR ingest.
7. Стандартизовать timeout/retry/backoff helper для deploy-critical fetchers.
