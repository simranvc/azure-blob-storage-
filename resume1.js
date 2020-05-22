const express =require('express') ;
const app = express();
const bodyParser =require('body-parser');
const fs =require('fs');
const environment  =require('../environment');
const cors  =require('cors');
const path  =require( 'path');

const multer   =require( 'multer');
const inMemoryStorage = multer.memoryStorage();
const singleFileUpload = multer({ storage: inMemoryStorage });
const azureStorage =require( 'azure-storage');
const getStream =require( 'into-stream');

// getting application environment
const env = process.env.NODE_ENV;
// console.log('env :', env);
// return false
// getting application config based on environment
const envConfig = environment[env];

// console.log('envConfig :', envConfig);
// return false
// setting port value
const port = 9494;


app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
}));

app.use(express.static(path.join(__dirname, '/public')));
app.use(cors());


const azureStorageConfig = {
    accountName: "edexabackup",
    accountKey: "CK4r5uFRsmw1gchZXyJ70k3yl1JrDqYsUY1lyblC03ruBh4hFk4RN2NpXeJCWHTFWuL9j+cVMHz4bj0SX+3hsQ==",
    blobURL: "https://edexabackup.blob.core.windows.net/",
    containerName: "archive-api"
};
 
async function uploadFileToBlob(directoryPath, file){

    console.log("Hello responce :-----",file);
    
    return new Promise((resolve, reject) => {
      // return false
        const blobName = getBlobName(file.originalname);
        const stream = getStream(file.buffer);
        // console.log("stream",stream);
        // return false
        // const streamLength = stream.length;
       const streamLength =  Math.ceil(file.buffer.length);
        // console.log("streamLength",streamLength);
        //  return false
        const blobService = azureStorage.createBlobService(azureStorageConfig.accountName, azureStorageConfig.accountKey); 
        blobService.createBlockBlobFromStream(azureStorageConfig.containerName, `${directoryPath}/${blobName}`, stream, streamLength, err => {
            if (err) {
                reject(err); 
            } else {
                resolve({ filename: blobName, 
                    originalname: file.originalname, 
                    size: streamLength, 
                    path: `${azureStorageConfig.containerName}/${directoryPath}/${blobName}`,
                    url: `${azureStorageConfig.blobURL}${azureStorageConfig.containerName}/${directoryPath}/${blobName}` });

                console.log("upload file successfully-----");
           
                }
        });
 
    });
 
};
 
const getBlobName = originalName => {
    const identifier = Math.random().toString().replace(/0\./, ''); // remove "0." from start of string
    return `${identifier}-${originalName}`;
};
 
const imageUpload = async(req, res, next) => {
    console.log("req :----------",req);

    try {
        const image = await uploadFileToBlob('files', req.file); // files is a directory in the Azure container
        return res.json(image);
    } catch (error) {
        next(error);
    }
}
 
app.post('/upload/file', singleFileUpload.single('file'),imageUpload);
app.listen(port, () => console.log(`Azure Blob storage in single part App listening on port ${port} !`))


module.exports = app;