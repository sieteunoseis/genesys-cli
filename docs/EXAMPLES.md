# Genesys CLI Examples

## Troubleshooting Workflows

### Call Not Reaching Genesys

When a call from CUCM/SBC isn't arriving in Genesys:

```bash
# 1. Check if BYOC trunks are healthy
genesys-cli trunks list

# 2. Search for the call by caller number
genesys-cli conversations list --caller 5033466520 --last 1h

# 3. Search by the dialed number
genesys-cli conversations list --callee 9712628841 --last 1h

# 4. If found, get full call detail
genesys-cli conversations detail <conversationId>
```

### Call Arriving But Failing

When calls reach Genesys but disconnect with errors:

```bash
# 1. Find conversations with errors
genesys-cli conversations list --disconnect-reason error --last 2h

# 2. Check trunk metrics for error counts
genesys-cli trunks metrics

# 3. Get detail on a specific failed call
genesys-cli conversations detail <conversationId> --format json
```

### BYOC Trunk Down

When a BYOC trunk shows disconnected or inactive:

```bash
# 1. List all trunks and check status
genesys-cli trunks list

# 2. Check trunk metrics for the affected trunk
genesys-cli trunks metrics

# 3. Run doctor to verify overall connectivity
genesys-cli doctor
```

### Queue Performance Check

Monitor queue health during business hours:

```bash
# Quick overview
genesys-cli queues list

# Detailed stats with agents online and waiting calls
genesys-cli queues list --detail

# Export to CSV for reporting
genesys-cli queues list --detail --format csv > queues-report.csv
```

### End-to-End Call Trace (with AudioCodes + Cisco)

Trace a call across the full path: Phone → CUCM → AudioCodes SBC → Genesys Cloud

```bash
# 1. Check AudioCodes SBC — did the call arrive?
audiocodes-cli calls list --device psxc3sbclab01
audiocodes-cli alarms list --device psxc3sbclab01

# 2. Pull CUCM SDL logs to see SIP routing
cisco-dime select "Cisco CallManager" --last 30m --all-nodes --include-active --download --decompress
# grep for the dialed number in calllogs

# 3. Check Genesys side — did the call arrive and how did it end?
genesys-cli conversations list --caller 5033466520 --last 1h
genesys-cli conversations list --callee 9712628841 --last 1h

# 4. Get full detail on the Genesys conversation
genesys-cli conversations detail <conversationId> --format json
```

## Output Format Examples

### Table (default)

```bash
genesys-cli conversations list --last 1h
```

### JSON (for scripting)

```bash
# Pipe to jq for filtering
genesys-cli conversations list --last 1h --format json | jq '.[].disconnectType'

# Save to file
genesys-cli trunks list --format json > trunks.json
```

### CSV (for spreadsheets)

```bash
# Export conversations to CSV
genesys-cli conversations list --last 7d --format csv > conversations.csv

# Export queue stats
genesys-cli queues list --detail --format csv > queues.csv
```

### TOON (for AI agents)

```bash
# Token-efficient format, ~40% fewer tokens than JSON
genesys-cli conversations list --last 1h --format toon
```

## Multi-Org Management

```bash
# Add multiple orgs
genesys-cli config add prod --client-id <id> --client-secret "$GENESYS_CLIENT_SECRET" --region usw2
genesys-cli config add staging --client-id <id> --client-secret "$GENESYS_CLIENT_SECRET" --region usw2

# Switch active org
genesys-cli config use prod

# Query a specific org without switching
genesys-cli conversations list --org staging --last 1h

# Compare trunks across orgs
genesys-cli trunks list --org prod
genesys-cli trunks list --org staging
```

## Filtering Conversations

```bash
# By caller (ANI)
genesys-cli conversations list --caller 5033466520

# By callee (DNIS)
genesys-cli conversations list --callee 9712628841

# By disconnect reason
genesys-cli conversations list --disconnect-reason error
genesys-cli conversations list --disconnect-reason peer
genesys-cli conversations list --disconnect-reason system

# By time range
genesys-cli conversations list --last 30m
genesys-cli conversations list --last 2h
genesys-cli conversations list --last 7d

# Combine filters
genesys-cli conversations list --caller 5033466520 --disconnect-reason error --last 1h

# Increase result limit
genesys-cli conversations list --last 7d --limit 100
```

## Health Checks

```bash
# Full connectivity check
genesys-cli doctor

# Quick trunk status
genesys-cli trunks list | grep -i disconnect

# Check for error conversations in last hour
genesys-cli conversations list --disconnect-reason error --last 1h
```
