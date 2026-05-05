#!/usr/bin/env tsx
import { App } from "aws-cdk-lib";
import { BoothubStack } from "../lib/boothub-stack.ts";

const app = new App();

const account = process.env.CDK_DEFAULT_ACCOUNT ?? "055021103065";

// CloudFront + ACM cert must be in us-east-1.
new BoothubStack(app, "BoothubStack", {
  env: { account, region: "us-east-1" },
  domainName: "boothub.dev",
});

app.synth();
