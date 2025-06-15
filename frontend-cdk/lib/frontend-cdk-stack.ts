import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";

export class FrontendCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiGatewayDomain = cdk.Fn.importValue(
      "BackendCdkStack-GraphqlApiDomain",
    );

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
      },
    );

    new cdk.CfnOutput(this, "S3BucketName", {
      value: frontendBucket.bucketName,
      description: "Name of the S3 bucket for frontend assets",
      exportName: `${this.stackName}-S3BucketName`,
    });

    new cdk.CfnOutput(this, "CloudFrontFullURL", {
      value: `https://${distribution.distributionDomainName}`,
      description: "Full CloudFront distribution URL with HTTPS",
      exportName: `${this.stackName}-CloudFrontFullURL`,
    });

    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: distribution.distributionId,
      description: "CloudFront distribution ID for cache invalidation",
      exportName: `${this.stackName}-CloudFrontDistributionId`,
    });

    new cdk.CfnOutput(this, "ImportedApiGatewayDomain", {
      value: apiGatewayDomain,
      description: "Imported API Gateway domain from backend stack",
    });
  }
}
