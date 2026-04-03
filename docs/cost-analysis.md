Human skim: `docs/reference-index.html#requirements`
# ChatBridge Cost Analysis

## Assumptions

- 1 active user session includes 8 chat turns
- 2 tool invocations per session on average
- 1 plugin mount per session on average
- 1 authenticated app refresh per connected user per day
- weather and github API calls fit free tiers for classroom scale
- Spotify API usage is free under normal developer quotas

## Token assumptions

### Average token use by interaction

- Plain chat turn: `900` input, `300` output, `1,200` total
- Tool-planning turn before app invoke: `1,400` input, `450` output, `1,850` total
- Plugin follow-up turn with app state in context: `1,800` input, `500` output, `2,300` total
- Short app completion / wrap-up turn: `700` input, `200` output, `900` total

### Session mix used for estimates

Per session:

- 4 plain chat turns = `4,800` total tokens
- 2 tool-planning turns = `3,700` total tokens
- 1 plugin-state follow-up turn = `2,300` total tokens
- 1 wrap-up turn = `900` total tokens

Estimated average per session: `11,700` total tokens

### App-state overhead

Extra plugin context added to later prompts:

- chess snapshot: `200` to `500` input tokens
- weather snapshot: `100` to `250` input tokens
- spotify/github auth + result snapshot: `150` to `350` input tokens

That overhead is already folded into the `plugin follow-up` estimate above.

## Cost buckets

### LLM costs

Primary cost driver.

- chat completion tokens
- reasoning tokens when model uses tool planning
- follow-up prompts that include plugin state snapshots

Monthly cost scales with:

- sessions per user
- average prompt size
- average tool planning depth
- number of app-state follow-up turns

## App platform costs

### Weather

- Open-Meteo public API
- expected direct API cost: zero

### Spotify

- OAuth flow cost: zero
- Web API cost: zero under normal usage

### GitHub

- device flow cost: zero
- REST API cost: zero for normal rate limits

## Desktop app costs

- embedded iframe rendering is local
- encrypted token storage is local
- no required backend for auth broker in current implementation

## Example monthly token volumes

Assumption for scale math: `12` sessions per active user per month.

### 100 users

- sessions per month: `1,200`
- total monthly tokens: about `14,040,000`
- input-heavy share stays dominant because plugin state is injected into later prompts
- plugin platform direct API cost: near zero

### 1,000 users

- sessions per month: `12,000`
- total monthly tokens: about `140,400,000`
- LLM cost dominates almost all other operating cost
- app/API costs remain low unless traffic is proxied server-side

### 10,000 users

- sessions per month: `120,000`
- total monthly tokens: about `1,404,000,000`
- prompt compaction and cheaper routing become mandatory
- app/API costs are still secondary unless premium APIs or hosted brokers are introduced

## Cost formula

Use this quick estimator:

`monthly_tokens = active_users × sessions_per_user_per_month × 11,700`

If the product shifts toward heavier app usage, replace `11,700` with:

`(plain_turns × 1,200) + (tool_turns × 1,850) + (plugin_followups × 2,300) + (wrapups × 900)`

## Best cost levers

- smaller default model for app orchestration turns
- compact plugin state summaries
- avoid unnecessary follow-up tool calls
- expire inactive plugin instances
- cache public API results where freshness permits
- cap plugin state snapshots before they bloat future prompts
