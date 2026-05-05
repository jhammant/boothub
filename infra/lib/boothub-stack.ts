import { join } from "node:path";
import {
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  OriginRequestPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin, S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";

export interface BoothubStackProps extends StackProps {
  domainName: string;
}

export class BoothubStack extends Stack {
  constructor(scope: Construct, id: string, props: BoothubStackProps) {
    super(scope, id, props);

    const root = join(import.meta.dirname, "..", "..");

    // ─── Static origin (S3) ─────────────────────────────────────────────
    const staticBucket = new Bucket(this, "StaticBucket", {
      bucketName: `${props.domainName.replace(/\./g, "-")}-static`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    new BucketDeployment(this, "StaticDeploy", {
      sources: [Source.asset(join(root, "static"))],
      destinationBucket: staticBucket,
    });

    // ─── Manifest Lambda ────────────────────────────────────────────────
    const manifestFn = new NodejsFunction(this, "ManifestFn", {
      runtime: Runtime.NODEJS_22_X,
      entry: join(root, "lambda", "handler.ts"),
      handler: "handler",
      timeout: Duration.seconds(10),
      memorySize: 256,
      bundling: {
        target: "es2022",
        minify: true,
        sourceMap: true,
      },
    });

    // ─── Swarm DynamoDB table ───────────────────────────────────────────
    const swarmTable = new Table(this, "SwarmTable", {
      tableName: "boothub-swarm",
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey: { name: "sk", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: RemovalPolicy.RETAIN, // don't accidentally lose user data
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // ─── Swarm Lambda ───────────────────────────────────────────────────
    const swarmFn = new NodejsFunction(this, "SwarmFn", {
      runtime: Runtime.NODEJS_22_X,
      entry: join(root, "lambda", "swarm.ts"),
      handler: "handler",
      timeout: Duration.seconds(15),
      memorySize: 384,
      environment: { SWARM_TABLE: swarmTable.tableName },
      bundling: {
        target: "es2022",
        minify: true,
        sourceMap: true,
        externalModules: ["@aws-sdk/*"], // Lambda Node 22 ships AWS SDK v3
      },
    });
    swarmTable.grantReadWriteData(swarmFn);

    // ─── API Gateway HTTP API ───────────────────────────────────────────
    const httpApi = new HttpApi(this, "HttpApi", {
      apiName: "boothub-api",
    });
    const manifestIntegration = new HttpLambdaIntegration("ManifestIntegration", manifestFn);
    const swarmIntegration = new HttpLambdaIntegration("SwarmIntegration", swarmFn);

    // Swarm + auth routes go to swarmFn
    httpApi.addRoutes({
      path: "/api/{proxy+}",
      methods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.DELETE, HttpMethod.PUT],
      integration: swarmIntegration,
    });
    // All other GETs go to manifestFn
    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [HttpMethod.GET],
      integration: manifestIntegration,
    });

    // ─── ACM cert (us-east-1) + Route53 ─────────────────────────────────
    const zone = HostedZone.fromLookup(this, "Zone", {
      domainName: props.domainName,
    });
    const cert = new Certificate(this, "Cert", {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: CertificateValidation.fromDns(zone),
    });

    // ─── CloudFront ─────────────────────────────────────────────────────
    const apiOrigin = new HttpOrigin(
      `${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`,
      { protocolPolicy: ("https-only" as never) },
    );

    const dynamicCachePolicy = new CachePolicy(this, "DynamicCachePolicy", {
      defaultTtl: Duration.minutes(5),
      maxTtl: Duration.minutes(60),
      minTtl: Duration.seconds(0),
      queryStringBehavior: { behavior: "whitelist", queryStrings: ["ref", "target", "nocache"] } as never,
    });

    const distribution = new Distribution(this, "Distribution", {
      domainNames: [props.domainName, `www.${props.domainName}`],
      certificate: cert,
      priceClass: PriceClass.PRICE_CLASS_100,
      defaultRootObject: "index.html",
      defaultBehavior: {
        // Default: serve dynamic from API Gateway.
        origin: apiOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: dynamicCachePolicy,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      additionalBehaviors: {
        "/index.html": staticBehavior(staticBucket),
        "/about.html": staticBehavior(staticBucket),
        "/favicon.ico": staticBehavior(staticBucket),
        "/app/*": staticBehavior(staticBucket),
        "/api/*": {
          origin: apiOrigin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    });

    new ARecord(this, "ApexAlias", {
      zone,
      recordName: props.domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
    new ARecord(this, "WwwAlias", {
      zone,
      recordName: `www.${props.domainName}`,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
  }
}

function staticBehavior(bucket: Bucket) {
  return {
    origin: S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
    cachePolicy: CachePolicy.CACHING_OPTIMIZED,
  };
}
