const AWS = require('aws-sdk');
const path = require('path');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const BUCKET = process.env.AWS_BUCKET_NAME;

// Upload image to S3 from multipart/form-data (req.file)
exports.uploadToS3 = async (file) => {
  if (!file || !file.buffer) {
    throw new Error('File buffer not found');
  }

  const ext = path.extname(file.originalname);
  const key = `uploads/${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`;

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
    // ACL: 'public-read' // Uncomment only if public access is needed and allowed
  };

  await s3.upload(params).promise();

  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
