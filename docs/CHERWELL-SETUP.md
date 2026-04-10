# ITSM Setup Guide — Cherwell & ServiceNow

ForgeOps supports two ITSM platforms for automated Change Request management:
- **Cherwell** (OAuth2 client_credentials)
- **ServiceNow** (Basic auth)

Pipelines auto-detect which is configured. If neither is set up, CR steps skip gracefully.

## Cherwell Setup

### 1. Create an API Client in Cherwell

1. Log into Cherwell Administrator
2. Navigate to **Security > Edit API client settings**
3. Create a new client:
   - **Name**: `ForgeOps Pipeline`
   - **Token Lifespan**: 3600 (1 hour)
   - **Refresh Token Lifespan**: 86400 (1 day)
   - **API Access**: Enabled
4. Note the **Client ID**

### 2. Create a Service Account

1. Create a Cherwell user for automation:
   - **Username**: `svc_forgeops`
   - **Role**: Change Manager (or similar with CR create/update permissions)
2. Note the credentials

### 3. Configure GitHub Secrets

Add these as **organization secrets** (Settings > Secrets > Actions):

| Secret | Value | Example |
|--------|-------|---------|
| `CHERWELL_URL` | Cherwell server URL | `https://cherwell.company.com` |
| `CHERWELL_CLIENT_ID` | API client ID | `a1b2c3d4-e5f6-...` |
| `CHERWELL_CLIENT_SECRET` | API client secret | `secret_value` |

### 4. Test Connectivity

```bash
export CHERWELL_URL="https://cherwell.company.com"
export CHERWELL_CLIENT_ID="your-client-id"
export CHERWELL_CLIENT_SECRET="your-client-secret"
bash scripts/cherwell-health-check.sh
```

### 5. What ForgeOps Does

| Pipeline Stage | Cherwell Action |
|---------------|-----------------|
| Deploy to STAGE | Creates CR (status: New) |
| Deploy to PROD (success) | Updates CR (status: Implemented) |
| Deploy to PROD (failure) | Updates CR (status: Failed) |
| Deploy to DEV/INT/QA | No CR (skipped) |

---

## ServiceNow Setup

### 1. Create an Integration User

1. Navigate to **User Administration > Users**
2. Create a new user:
   - **User ID**: `svc_forgeops`
   - **Roles**: `itil`, `change_manager`
   - **Web service access only**: Yes
3. Set a strong password

### 2. Configure GitHub Secrets

| Secret | Value | Example |
|--------|-------|---------|
| `SERVICENOW_URL` | Instance URL | `https://company.service-now.com` |
| `SERVICENOW_USER` | Integration user | `svc_forgeops` |
| `SERVICENOW_PASSWORD` | User password | `secure_password` |

### 3. Test Connectivity

```bash
export SERVICENOW_URL="https://company.service-now.com"
export SERVICENOW_USER="svc_forgeops"
export SERVICENOW_PASSWORD="your-password"
bash scripts/cherwell-health-check.sh
```

### 4. ServiceNow API Notes

ForgeOps uses the Table API:
- **Create CR**: `POST /api/now/table/change_request`
- **Update CR**: `PATCH /api/now/table/change_request?sysparm_query=number={cr_id}`

Fields mapped:
| ForgeOps | ServiceNow Field |
|----------|-----------------|
| App name + version | `short_description` |
| Deployment details | `description` |
| Approver (GitHub actor) | `requested_by` |
| Environment | Included in description |

---

## Troubleshooting

### "ITSM not configured — skipping"
This is expected if you haven't set up Cherwell or ServiceNow secrets. The pipeline continues normally without CR management.

### "Cherwell OAuth error (401)"
- Verify `CHERWELL_CLIENT_ID` and `CHERWELL_CLIENT_SECRET` are correct
- Check that the API client is enabled in Cherwell Administrator
- Ensure the token hasn't expired

### "ServiceNow API error (403)"
- Verify the integration user has `itil` and `change_manager` roles
- Check that the user account is active and not locked
- Ensure web service access is enabled for the user

### CR not appearing in Cherwell/ServiceNow
- Check the GitHub Actions logs for the ITSM step
- Verify the Change Request business object / table is accessible
- Check field mappings match your instance configuration
