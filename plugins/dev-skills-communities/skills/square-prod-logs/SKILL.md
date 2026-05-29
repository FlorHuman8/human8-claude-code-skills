---
name: square-prod-logs
description: >
  Query Square production Cosmos DB logs to find error trends, detect bugs, and investigate
  production issues. Use this skill whenever the user asks to check production logs, investigate
  errors on prod, find trends in the Square platform, debug a production issue, or asks "what's
  happening on prod". Also trigger on: "check prod logs", "any errors on prod", "what's failing",
  "find trends", "investigate issue on Square", "look at production", "check Cosmos logs",
  or any request involving production observability for the Square platform. There are two
  production regions: EU (default) and AU — always ask which unless context is clear.
---

# Square Production Logs — Skill

Query **Square production Cosmos DB** to surface error trends and investigate bugs.
Two production regions with separate Azure subscriptions.

## Cosmos DB Instances

| Region | Account | Subscription ID | Resource Group |
|--------|---------|-----------------|----------------|
| EU (default) | `square-prd-cosmosdb` | `badebb3b-0429-40e3-b23e-629a3cb902cb` | `square-prd-rg` |
| AU | `square-au-prd-cosmosdb` | `b1b736a7-60db-4b81-95b3-4240d81eb77c` | `square-au-prd-rg` |

Both have database `insitesecolog`.

### EU containers
| Container | Partition key |
|-----------|--------------|
| `insitesecolog` | `/Environment` |
| `ai-moderator-telemetry-logs` | `/DiscussionGuid` |

### AU containers
| Container | Partition key |
|-----------|--------------|
| `insiteseco` | `/Environment` |
| `insitesecolog` | `/ClientCode` |
| `ai-moderator-telemetry-logs` | `/DiscussionGuid` |

## Known schema (verified against live data)

**`insitesecolog` container fields:**
- `Severity` — **integer**: `4` = Error, `3` = Warning, `2` = Info
- `LogType` — integer: `0` = exception log, `3`/`4`/`5` = event/telemetry
- `ExceptionMessage` — string, format `"ExceptionTypeName: message text"` — best field for grouping
- `Exception` — JSON string with full exception details
- `ExceptionCode` — numeric string
- `Message` — human-readable description
- `Application` — `"QueryApi"`, `"CommandApi"`, `"ClientApi"`
- `ClientCode` — client identifier string (e.g. `"ISC"`)
- `Environment` — `"production"`, `"staging"`, etc.
- `Url` — request path
- `Category` — `"Service"`, `"Cache"`, etc.
- `MachineName`, `CorrelationId`, `UserId`, `MemberName`
- `DateCreated` — ISO 8601 string
- `_ts` — Unix epoch integer (use this for time filtering)

---

## Step 1 — Get credentials

```bash
# EU read-only key
az cosmosdb keys list \
  --name square-prd-cosmosdb \
  --resource-group square-prd-rg \
  --subscription badebb3b-0429-40e3-b23e-629a3cb902cb \
  --type keys --query "primaryReadonlyMasterKey" -o tsv

# AU read-only key
az cosmosdb keys list \
  --name square-au-prd-cosmosdb \
  --resource-group square-au-prd-rg \
  --subscription b1b736a7-60db-4b81-95b3-4240d81eb77c \
  --type keys --query "primaryReadonlyMasterKey" -o tsv
```

Endpoint pattern: `https://<account-name>.documents.azure.com:443/`

Check/install SDK: `pip show azure-cosmos` — if missing: `pip install azure-cosmos`
Use Python at `C:\Users\VincentD\AppData\Local\Programs\Python\Python311\python.exe` on Windows.

---

## Step 2 — Run the standard analysis script

Use this script as the starting point. Run it via PowerShell here-string to avoid encoding issues:

```python
import sys, os, datetime, json, re
os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding="utf-8")
from azure.cosmos import CosmosClient
from collections import Counter

ENDPOINT = "https://<account>.documents.azure.com:443/"
KEY = "<readonly-key>"

client = CosmosClient(url=ENDPOINT, credential=KEY)
db = client.get_database_client("insitesecolog")
container = db.get_container_client("insitesecolog")

now = datetime.datetime.utcnow()
cutoff_24h = int((now - datetime.timedelta(hours=24)).timestamp())
cutoff_48h = int((now - datetime.timedelta(hours=48)).timestamp())
cutoff_7d  = int((now - datetime.timedelta(days=7)).timestamp())

def safe(v):
    if v is None: return "(none)"
    return str(v).encode("ascii", "replace").decode("ascii")[:100]

def extract_exception_type(exc_msg, exc_field=None):
    s = str(exc_msg or "")
    if not s or s == "None":
        try:
            obj = json.loads(str(exc_field or ""))
            s = obj.get("Message", "")
        except: pass
    if not s or s == "None": return "(unknown)"
    first_line = s.split("\n")[0].strip()
    match = re.match(r'^([A-Za-z][A-Za-z0-9_.]*(?:Exception|Error)[A-Za-z0-9_.]*)[:. ]', first_line)
    if match: return match.group(1)
    return first_line[:80]

# 1. Counts
c_err_24h = list(container.query_items(
    query=f"SELECT VALUE COUNT(1) FROM c WHERE c._ts > {cutoff_24h} AND c.Severity = 4",
    enable_cross_partition_query=True))[0]
c_err_48h = list(container.query_items(
    query=f"SELECT VALUE COUNT(1) FROM c WHERE c._ts > {cutoff_48h} AND c._ts <= {cutoff_24h} AND c.Severity = 4",
    enable_cross_partition_query=True))[0]
c_warn_24h = list(container.query_items(
    query=f"SELECT VALUE COUNT(1) FROM c WHERE c._ts > {cutoff_24h} AND c.Severity = 3",
    enable_cross_partition_query=True))[0]

delta = ""
if c_err_48h > 0:
    pct = round((c_err_24h - c_err_48h) / c_err_48h * 100)
    delta = f"  ({'+' if pct>=0 else ''}{pct}% vs prior 24h)"

print(f"\n{'='*60}")
print(f"SQUARE {'EU' if 'prd-cosmosdb' in ENDPOINT else 'AU'} PROD  {now.strftime('%Y-%m-%d %H:%M')} UTC")
print(f"{'='*60}")
print(f"\n[ERROR VOLUME]\n  Last 24h: {c_err_24h}{delta}\n  Prior 24h: {c_err_48h}\n  Warnings: {c_warn_24h}")

# 2. Fetch all errors for in-memory analysis (avoids GROUP BY SDK issues)
errors_24h = list(container.query_items(
    query=f"SELECT c.ExceptionMessage, c.Exception, c.ClientCode, c.Application, c.Url, c._ts FROM c WHERE c._ts > {cutoff_24h} AND c.Severity = 4",
    enable_cross_partition_query=True))

# 3. Top exception types
type_counts = Counter(
    extract_exception_type(d.get("ExceptionMessage"), d.get("Exception"))
    for d in errors_24h)
print(f"\n[TOP EXCEPTION TYPES  last 24h]")
for t, cnt in type_counts.most_common(12):
    print(f"  {cnt:5d}  {safe(t)}")

# 4. New exception types vs prior 7d
errors_7d = list(container.query_items(
    query=f"SELECT c.ExceptionMessage, c.Exception FROM c WHERE c._ts > {cutoff_7d} AND c._ts <= {cutoff_24h} AND c.Severity = 4",
    enable_cross_partition_query=True))
types_prior = {extract_exception_type(d.get("ExceptionMessage"), d.get("Exception")) for d in errors_7d}
new_types = set(type_counts.keys()) - types_prior - {"(unknown)"}
print(f"\n[NEW EXCEPTION TYPES  not in prior 7 days]")
for t in sorted(new_types):
    print(f"  ** {type_counts[t]}x  {safe(t)}")
if not new_types:
    print("  (none)")

# 5. By application
app_counts = Counter(d.get("Application", "?") for d in errors_24h)
print(f"\n[BY APPLICATION]")
for app, cnt in app_counts.most_common():
    print(f"  {cnt:5d}  {safe(app)}")

# 6. By client
client_counts = Counter(d.get("ClientCode", "?") for d in errors_24h)
print(f"\n[BY CLIENT  top 10]")
for cc, cnt in client_counts.most_common(10):
    print(f"  {cnt:5d}  {safe(cc)}")

# 7. Failing endpoints
def norm_url(url):
    if not url or url == "None": return None
    url = re.sub(r'[0-9a-f]{8}-[0-9a-f-]{27}', '<guid>', str(url))
    url = re.sub(r'/\d+', '/<id>', url)
    return url
url_counts = Counter(norm_url(d.get("Url")) for d in errors_24h if norm_url(d.get("Url")))
print(f"\n[TOP FAILING ENDPOINTS]")
for url, cnt in url_counts.most_common(10):
    print(f"  {cnt:5d}  {safe(url)}")

# 8. AI moderator
ai = db.get_container_client("ai-moderator-telemetry-logs")
ai_count = list(ai.query_items(
    query=f"SELECT VALUE COUNT(1) FROM c WHERE c._ts > {cutoff_24h}",
    enable_cross_partition_query=True))[0]
print(f"\n[AI MODERATOR TELEMETRY  last 24h]\n  {ai_count} records")
print(f"\n{'='*60}\n")
```

---

## Step 3 — Drill into a specific error

When the summary flags something worth investigating, fetch recent examples:

```python
# Get last 10 occurrences of a specific exception type with stack traces
samples = list(container.query_items(
    query=f"""
        SELECT TOP 10 c.ExceptionMessage, c.StackTrace, c.Url, c.ClientCode,
                      c.CorrelationId, c.DateCreated, c.Application
        FROM c
        WHERE c._ts > {cutoff_24h}
          AND c.Severity = 4
          AND CONTAINS(c.ExceptionMessage, 'UnsupportedMediaTypeException')
        ORDER BY c._ts DESC
    """,
    enable_cross_partition_query=True))

for s in samples:
    print(s.get("DateCreated"), s.get("Url"))
    print(s.get("ExceptionMessage","")[:200])
    print()
```

---

## Step 4 — Present findings

Always structure the output as:

```
## Square [EU/AU] Prod — Log Analysis — [date] UTC

### Volume
- Last 24h: X errors  (+Y% vs prior 24h)
- Warnings: Z

### Top error types
1. ExceptionType — N occurrences  [Application]  [endpoint]
2. ...

### New this week ⚠️
- NewExceptionType — Nx (not seen in prior 7 days)

### Most affected clients
- ClientCode — N errors

### AI Moderator
- N telemetry records
```

If the user asks about a specific error, show 3–5 representative examples with their
`ExceptionMessage`, `Url`, `DateCreated`, and `CorrelationId`.

---

## Cosmos DB SQL notes

- `Severity` is an **integer**: use `= 4` not `= 'Error'`
- `_ts` is Unix epoch seconds — compute cutoff timestamps in Python, not SQL
- Avoid `GROUP BY` with aggregate columns in SQL — fetch rows and aggregate in Python instead
  (the SDK chokes on `NonValueAggregate` in cross-partition GROUP BY)
- To narrow scope and speed up queries: `WHERE c.Environment = 'production'`
  or `WHERE c.ClientCode = 'ISC'`
- `CONTAINS(c.Field, 'substring')` for text search in SQL
