import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { requireEnv } from "./require-env";

export interface FrontendCdkStackProps extends cdk.StackProps {
  httpApi: apigatewayv2.IHttpApi;
}

export class FrontendCdkStack extends cdk.Stack {
  public readonly distribution: cloudfront.IDistribution;
  public readonly customDomainUrl: string | undefined;

  constructor(scope: Construct, id: string, props: FrontendCdkStackProps) {
    // crossRegionReferences is required for referencing ACM certs in us-east-1
    // from stacks deployed to other regions
    super(scope, id, { crossRegionReferences: true, ...props });

    const nodeEnv = requireEnv("NODE_ENV");

    // Add tags to all resources in this stack
    cdk.Tags.of(this).add("environment", nodeEnv);

    // SSM lookup for optional custom domain — empty string default means
    // the parameter is optional (mustExist: false); no error if absent
    const customDomain = ssm.StringParameter.valueFromLookup(
      this,
      `/manual/budget/${nodeEnv}/frontend/custom-domain`,
      "",
    );

    // Guard: skip all custom domain resources when the value is a CDK token,
    // an empty string, or a dummy placeholder returned before the context is
    // populated (e.g. during the first synth with no cache entry)
    const hasCustomDomain =
      !cdk.Token.isUnresolved(customDomain) &&
      customDomain !== "" &&
      !customDomain.startsWith("dummy-value-for-");

    const apiGatewayDomain = `${props.httpApi.apiId}.execute-api.${this.region}.amazonaws.com`;

    const frontendBucket = new s3.Bucket(this, "Assets", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiGatewayOrigin = new origins.HttpOrigin(apiGatewayDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      originId: "GraphqlApi",
    });

    // Conditionally prepare custom domain resources before creating the distribution,
    // because domainNames and certificate must be provided at construction time
    let certificate: acm.ICertificate | undefined;
    let hostedZone: route53.IHostedZone | undefined;

    if (hasCustomDomain) {
      // Pre-existing hosted zone looked up by domain name.
      // Route 53 is a global service; lookup works from any region.
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain,
      });

      // ACM certificates for CloudFront must reside in us-east-1.
      // Create a sibling stack in us-east-1 (crossRegionReferences: true
      // on both stacks lets CDK wire the cert ARN across regions via SSM).
      const certStack = new cdk.Stack(this.node.root, `${this.node.id}-Cert`, {
        stackName: `${this.stackName}-Cert`,
        env: { account: this.account, region: "us-east-1" },
        crossRegionReferences: true,
      });
      cdk.Tags.of(certStack).add("environment", nodeEnv);

      // Route 53 is global; a second fromLookup in the cert stack provides
      // the hosted zone construct scoped to that stack (needed for cert validation)
      const certHostedZone = route53.HostedZone.fromLookup(
        certStack,
        "HostedZone",
        { domainName: customDomain },
      );

      certificate = new acm.Certificate(certStack, "Certificate", {
        domainName: customDomain,
        validation: acm.CertificateValidation.fromDns(certHostedZone),
      });
    }

    this.distribution = new cloudfront.Distribution(
      this,
      "FrontendDistribution",
      {
        comment: `${this.stackName} - Frontend assets`,
        defaultBehavior: {
          origin: new origins.S3StaticWebsiteOrigin(frontendBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        },
        additionalBehaviors: {
          "/graphql*": {
            origin: apiGatewayOrigin,
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            originRequestPolicy:
              cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            responseHeadersPolicy:
              cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
          },
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
        enableLogging: true,
        // Custom domain alias and certificate — only when configured
        domainNames: hasCustomDomain ? [customDomain] : undefined,
        certificate,
      },
    );

    if (hasCustomDomain && hostedZone) {
      // Route 53 A record (alias) pointing the custom domain to CloudFront
      new route53.ARecord(this, "CustomDomainARecord", {
        zone: hostedZone,
        recordName: customDomain,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(this.distribution),
        ),
      });

      this.customDomainUrl = `https://${customDomain}`;

      // Emitted only when a custom domain is configured
      new cdk.CfnOutput(this, "CustomDomainURL", {
        value: this.customDomainUrl,
        description: "Custom domain URL for the frontend application",
      });
    }

    // Used by deploy.sh to upload frontend assets after build.
    new cdk.CfnOutput(this, "S3BucketName", {
      value: frontendBucket.bucketName,
      description: "S3 bucket name used by deploy.sh for frontend asset upload",
    });

    // Used manually to open the deployed application.
    new cdk.CfnOutput(this, "CloudFrontFullURL", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "Full CloudFront distribution URL for opening the app",
    });

    // Used by deploy.sh to invalidate cache after asset upload.
    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: this.distribution.distributionId,
      description:
        "CloudFront distribution ID used by deploy.sh for cache invalidation",
    });
  }
}
