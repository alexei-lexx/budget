import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { requireEnv } from "./require-env";

export interface FrontendCdkStackProps extends cdk.StackProps {
  httpApi: apigatewayv2.HttpApi;
}

export class FrontendCdkStack extends cdk.Stack {
  public readonly distributionUrl: string;

  constructor(scope: Construct, id: string, props: FrontendCdkStackProps) {
    super(scope, id, props);

    const nodeEnv = requireEnv("NODE_ENV");

    // Add tags to all resources in this stack
    cdk.Tags.of(this).add("environment", nodeEnv);

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

    const distribution = new cloudfront.Distribution(
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
      },
    );

    // Expose full CloudFront URL for cross-stack reference
    this.distributionUrl = `https://${distribution.distributionDomainName}`;

    // Used by deploy.sh to upload frontend assets after build.
    new cdk.CfnOutput(this, "S3BucketName", {
      value: frontendBucket.bucketName,
      description: "S3 bucket name used by deploy.sh for frontend asset upload",
    });

    // Used manually to open the deployed application.
    new cdk.CfnOutput(this, "CloudFrontFullURL", {
      value: this.distributionUrl,
      description: "Full CloudFront distribution URL for opening the app",
    });

    // Used by deploy.sh to invalidate cache after asset upload.
    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: distribution.distributionId,
      description:
        "CloudFront distribution ID used by deploy.sh for cache invalidation",
    });
  }
}
