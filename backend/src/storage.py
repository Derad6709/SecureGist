import boto3
import os
from botocore.exceptions import ClientError

class Storage:
    def __init__(self):
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "securegist-dev")
        
        # Internal endpoint for backend -> S3 communication
        self.endpoint_url = os.getenv("S3_ENDPOINT_URL")
        # Public endpoint for browser -> S3 communication (Presigned URLs)
        self.public_endpoint_url = os.getenv("S3_PUBLIC_ENDPOINT_URL")

        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url
        )

    def _replace_endpoint(self, url: str) -> str:
        if self.endpoint_url and self.public_endpoint_url and self.endpoint_url in url:
            return url.replace(self.endpoint_url, self.public_endpoint_url)
        return url

    def generate_presigned_post(self, key: str, max_size_bytes: int = 10485760) -> dict | None:
        """Generate a presigned URL S3 POST request to upload a file"""
        try:
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=key,
                Fields=None,
                Conditions=[
                    ["content-length-range", 0, max_size_bytes]
                ],
                ExpiresIn=3600
            )
            
            # Replace internal endpoint with public endpoint in the URL
            if response and 'url' in response:
                response['url'] = self._replace_endpoint(response['url'])
                
            return response
        except ClientError as e:
            print(f"S3 Presigned Post Error: {e}")
            return None

    def generate_presigned_url(self, key: str) -> str | None:
        """Generate a presigned URL to share an S3 object"""
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=3600
            )
            return self._replace_endpoint(response) if response else None
        except ClientError as e:
            print(f"S3 Presigned URL Error: {e}")
            return None

    def delete(self, key: str) -> bool:
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            print(f"S3 Delete Error: {e}")
            return False

# Singleton instance
storage = Storage()
