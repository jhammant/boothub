#!/usr/bin/env tsx
import { App } from "aws-cdk-lib";
import { BoothubStack } from "../lib/boothub-stack.ts";

const app = new App();

// Pass via env vars (CDK convention) or `-c domain=...` context.
// CDK_DEFAULT_ACCOUNT is set automatically by `cdk` when AWS creds are configured.
const account = process.env.CDK_DEFAULT_ACCOUNT;
const domainName = (app.node.tryGetContext("domain") as string | undefined) ?? "boothub.dev";

if (!account) {
  throw new Error("CDK_DEFAULT_ACCOUNT not set. Run via `cdk` (which sets it) or `AWS_PROFILE=...`.");
}

// CloudFront + ACM cert must be in us-east-1.
new BoothubStack(app, "BoothubStack", {
  env: { account, region: "us-east-1" },
  domainName,
});

app.synth();
