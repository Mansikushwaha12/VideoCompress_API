const express = require('express');
const multer = require('multer');
const { S3 } = require('@aws-sdk/client-s3');
const { fromIni } = require('@aws-sdk/credential-provider-ini');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const app = express();

const s3 = new S3({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIASZLRADBVCZFULVY7',
  secretAccessKey: 'ECmvLlXkcS/2DR3embwOtlw0qA5818EfM4zLeoVVY',
  },
});

const S3_BUCKET = 'processbucket1213';
const EC2_INSTANCE_IP = '3.90.227.21';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/compress', upload.single('video'), async (req, res) => {
  try {
    const videoFile = req.file;
    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: videoFile.originalname,
      Body: videoFile.buffer,
    };

    const s3UploadResponse = await s3.send(new PutObjectCommand(uploadParams));

    const compressedFileName = `compressed_${videoFile.originalname}`;
    const compressedFilePath = `/Users/praveenkumar/Desktop/${compressedFileName}`;

    ffmpeg()
      .input(videoFile.buffer)
      .videoCodec('libx264')
      .audioCodec('aac')
      .output(compressedFilePath)
      .on('end', async () => {
        // Upload compressed video to S3
        const compressedVideoBuffer = fs.readFileSync(compressedFilePath);
        const compressedUploadParams = {
          Bucket: S3_BUCKET,
          Key: compressedFileName,
          Body: compressedVideoBuffer,
        };

        await s3.send(new PutObjectCommand(compressedUploadParams));

       
        fs.unlinkSync(compressedFilePath);

        res.status(200).json({
          message: 'Video compression and upload successful!',
          originalVideoUrl: s3UploadResponse.Location,
          compressedVideoUrl: compressedUploadParams.Location,
        });
      })
      .on('error', (err) => {
        console.error('Error during video compression:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      })
      .run();
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});