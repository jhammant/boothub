# AWS deployment

boothub.dev is deployed entirely on AWS. This doc explains the topology and how to deploy your own copy.

## Topology

```text
                Route53 (boothub.dev hosted zone)
                          │ ALIAS
                          ▼
                  CloudFront distribution
                          │
              ┌───────────┴────────────────┐
              ▼                            ▼
     S3 (private, OAC)          API Gateway HTTP API
     /, /about.html, /app/*     /USERNAME, /USERNAME/PRESET, /api/*
                                        │
                                        ▼
                              ┌─ ManifestFn (no auth)
                              ├─ SwarmFn (Cognito JWT + claim-key)
                              └─ AuthFn  (claim-key + login flows)
```

All in `us-east-1` (CloudFront cert region).

## Stack contents

| Resource | Purpose |
|---|---|
| S3 bucket `boothub-dev-static` | Static assets (`index.html`, `about.html`, `/app/*`) |
| Lambda `ManifestFn` (Node 22) | Reads GitHub raw, applies preset, returns markdown |
| Lambda `SwarmFn` | Notes CRUD on DynamoDB |
| Lambda `AuthFn` | Magic-link issuer, claim-key issuer |
| API Gateway HTTP API | Routes to Lambdas |
| ACM cert | `boothub.dev` + `www.boothub.dev` (DNS-validated) |
| CloudFront distribution | CDN, edge cache, custom domain |
| Route53 ALIAS records | apex + www → CloudFront |
| Cognito User Pool | Email + GitHub + Google federation |
| DynamoDB `boothub-swarm-notes` | Notes index |
| S3 bucket `boothub-swarm-bodies` | Notes >16KB |

## Deploy

```bash
# Once per account/region:
npx cdk bootstrap aws://ACCOUNT/us-east-1

# Each deploy:
cd infra
npx cdk deploy --require-approval never
```

CDK will:
1. Build/bundle the Lambda code (esbuild).
2. Create or update all resources.
3. Validate the ACM cert via Route53 (auto, ~1–5 min first time).
4. Wait for CloudFront propagation (~10–20 min first time).

## CI/CD

`.github/workflows/deploy.yml` runs on push to `main`:

1. Assumes `AWS_DEPLOY_ROLE_ARN` via OIDC (no long-lived AWS keys).
2. `npm ci`.
3. `npx cdk deploy --require-approval never`.

Set up the OIDC trust in IAM: `boothub-deploy` role assumable by `repo:jhammant/boothub:ref:refs/heads/main`.

## Cost

For low traffic (<10k requests/day):
- CloudFront: ~$0.10/month
- Lambda: ~$0.01/month (free tier covers this)
- S3: ~$0.05/month
- API Gateway: ~$0.05/month
- DynamoDB on-demand: ~$0.05/month
- Route53 zone: $0.50/month (fixed)

Total: <$1/month idle.

Set a CloudWatch billing alarm at $5/month as a tripwire.

## Tearing it down

```bash
cd infra
npx cdk destroy
```

The S3 bucket has `autoDeleteObjects: true` so it removes cleanly. DynamoDB is on-demand so there's no leftover capacity to cancel. The Route53 zone stays (paid by registration, separate from the stack).
