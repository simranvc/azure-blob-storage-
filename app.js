// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/*
 Setup: Enter your storage account name, SAS and a path pointing to local file in main()
*/
import express from 'express';
const app = express();
import bodyParser from 'body-parser';
import fs from 'fs';
import environment from '../environment';
import cors from 'cors';
import path from 'path';

import multer from 'multer';
const inMemoryStorage = multer.memoryStorage();
const singleFileUpload = multer({ storage: inMemoryStorage });
import azureStorage from 'azure-storage';
import getStream from 'into-stream';
import { log } from 'util';
 
// getting application environment
const env = process.env.NODE_ENV;
const envConfig = environment[env];
const port = envConfig.port || 3000;

app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
}));
app.use(express.static(path.join(__dirname, '/public')));
app.use(cors());


const { AbortController } = require("@azure/abort-controller");
const { AnonymousCredential, BlobServiceClient, newPipeline } = require("@azure/storage-blob");

// Load the .env file if it exists
require("dotenv").config();

const { setLogLevel } = require("@azure/logger");
setLogLevel("info");

async function storeInMultiplePart(directoryPath,file) {
  // Fill in following settings before running this sample
  const account = process.env.ACCOUNT_NAME || "edexabackup";
  const accountSas = process.env.ACCOUNT_SAS || "CK4r5uFRsmw1gchZXyJ70k3yl1JrDqYsUY1lyblC03ruBh4hFk4RN2NpXeJCWHTFWuL9j+cVMHz4bj0SX+3hsQ==";
  const localFilePath = file.Buffer;

  const pipeline = newPipeline(new AnonymousCredential(), {
    // httpClient: MyHTTPClient, // A customized HTTP client implementing IHttpClient interface
    retryOptions: { maxTries: 4 }, // Retry options
    userAgentOptions: { userAgentPrefix: "AdvancedSample V1.0.0" }, // Customized telemetry string
    keepAliveOptions: {
      // Keep alive is enabled by default, disable keep alive by setting false
      enable: false
    }
  });

  const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net${accountSas}`,
    pipeline
  );

  // Create a container
  const containerName = `newcontainer${new Date().getTime()}`;
  const containerClient = blobServiceClient.getContainerClient(containerName);
  try {
    await containerClient.create();
  } catch (err) {
    console.log(
      `Creating a container fails, requestId - ${err.details.requestId}, statusCode - ${err.statusCode}, errorCode - ${err.details.errorCode}`
    );
  }

  // Create a blob
  const blobName = "newblob" + new Date().getTime();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Parallel uploading with BlockBlobClient.uploadFile() in Node.js runtime
  // BlockBlobClient.uploadFile() is only available in Node.js
  try {
    await blockBlobClient.uploadFile(localFilePath, {
      blockSize: 4 * 1024 * 1024, // 4MB block size
      concurrency: 20, // 20 concurrency
      onProgress: (ev) => console.log(ev)
    });
    console.log("uploadFile succeeds");
  } catch (err) {
    console.log(
      `uploadFile failed, requestId - ${err.details.requestId}, statusCode - ${err.statusCode}, errorCode - ${err.details.errorCode}`
    );
  }

  // Parallel uploading a Readable stream with BlockBlobClient.uploadStream() in Node.js runtime
  // BlockBlobClient.uploadStream() is only available in Node.js
  try {
    await blockBlobClient.uploadStream(fs.createReadStream(localFilePath), 4 * 1024 * 1024, 20, {
      abortSignal: AbortController.timeout(30 * 60 * 1000), // Abort uploading with timeout in 30mins
      onProgress: (ev) => console.log(ev)
    });
    console.log("uploadStream succeeds");
  } catch (err) {
    console.log(
      `uploadStream failed, requestId - ${err.details.requestId}, statusCode - ${err.statusCode}, errorCode - ${err.details.errorCode}`
    );
  }

  // Parallel uploading a browser File/Blob/ArrayBuffer in browsers with BlockBlobClient.uploadBrowserData()
  // Uncomment following code in browsers because BlockBlobClient.uploadBrowserData() is only available in browsers
  /*
  const browserFile = document.getElementById("fileinput").files[0];
  await blockBlobClient.uploadBrowserData(browserFile, {
    blockSize: 4 * 1024 * 1024, // 4MB block size
    concurrency: 20, // 20 concurrency
    onProgress: ev => console.log(ev)
  });
  */

  // Parallel downloading a block blob into Node.js buffer
  // downloadToBuffer is only available in Node.js
  const fileSize = fs.statSync(localFilePath).size;
  const buffer = Buffer.alloc(fileSize);
  try {
    await blockBlobClient.downloadToBuffer(buffer, 0, undefined, {
      abortSignal: AbortController.timeout(30 * 60 * 1000), // Abort uploading with timeout in 30mins
      blockSize: 4 * 1024 * 1024, // 4MB block size
      concurrency: 20, // 20 concurrency
      onProgress: (ev) => console.log(ev)
    });
    console.log("downloadToBuffer succeeds");
  } catch (err) {
    console.log(
      `downloadToBuffer failed, requestId - ${err.details.requestId}, statusCode - ${err.statusCode}, errorCode - ${err.details.errorCode}`
    );
  }

  // Archive the blob - Log the error codes
  await blockBlobClient.setAccessTier("Archive");
  try {
    // Downloading an archived blockBlob fails
    console.log("// Downloading an archived blockBlob fails...");
    await blockBlobClient.download();
  } catch (err) {
    // BlobArchived	Conflict (409)	This operation is not permitted on an archived blob.
    console.log(
      `requestId - ${err.details.requestId}, statusCode - ${err.statusCode}, errorCode - ${err.details.errorCode}`
    );
    console.log(`error message - ${err.details.message}\n`);
  }

  // Delete container
  await containerClient.delete();
  console.log("deleted container");
}


const getBlobName = originalName => {
  const identifier = Math.random().toString().replace(/0\./, ''); // remove "0." from start of string
  return `${identifier}-${originalName}`;
};

const fileUpload = async(req, res, next) => {
  // console.log("hello responce :--------");
  // return
  try {
      const image = await storeInMultiplePart('files', req.file); // images is a directory in the Azure container
      return res.json(image);
  } catch (error) {
      next(error);
  }
}
app.post('/upload/file', singleFileUpload.single('file'), fileUpload);





app.listen(port, () => console.log(`Azure Blob storage App listening on port ${port} !`))

module.exports = app;