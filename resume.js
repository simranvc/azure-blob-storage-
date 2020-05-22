const {BlockBlobClient}=require("@azure/storage-blob")
var express = require('express');
const app = express();
var bodyParser = require('body-parser');
var fs = require('fs')
var environment = require('../enviornment')
var cors = require('cors');
var path = require('path');

var multer = require('multer');
const inMemoryStorage = multer.memoryStorage();
const singleFileUpload = multer({
    storage: inMemoryStorage
});
var azureStorage = require('azure-storage');
var getStream = require('into-stream');
app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
}));

app.use(express.static(path.join(__dirname, '/public')));
app.use(cors());
const port = 9494;

// const filePath = path.basename("single.js")
const blobURL= "https://edexabackup.blob.core.windows.net/";
const connectionString="DefaultEndpointsProtocol=https;AccountName=edexabackup;AccountKey=CK4r5uFRsmw1gchZXyJ70k3yl1JrDqYsUY1lyblC03ruBh4hFk4RN2NpXeJCWHTFWuL9j+cVMHz4bj0SX+3hsQ==;EndpointSuffix=core.windows.net";
var containerName ="testing-container";


const max_block_size=5* 1024 *1024 //5mb
const max_short_size = 256 *1024 *1024 //256mb
//const filePath = path.basename("single.js")
const options = {
    blockSize:max_block_size,
    concurrency:3,
    max_single_shot_size:max_short_size

}
async function blob(file){
    const filePath=file
    const blobName=Math.random().toString().replace(/0\./, '')+ filePath
        return new Promise ((resolve,reject)=>{
            const BlobClient= new BlockBlobClient(connectionString,containerName,blobName);
            BlobClient.uploadFile(filePath,options).then(uploadcommonresponse =>{
                console.log(uploadcommonresponse)
                if(err){
                    reject(err)
                }
                else{
                    resolve({ 
                        filename:filePath,
                        url: `${blobURL}${containerName}/${blobName}` });
                }
               
            })
        }
    )
    
 
}
blob()
// const getBlobName = originalName => {
//     const identifier = Math.random().toString().replace(/0\./, ''); // remove "0." from start of string
//     return `${identifier}-${originalName}`;
// };

const imageUpload = async (req, res, next) => {
    console.log("req :----------", req.file);

    try {
        const image = await blob(req.file); // files is a directory in the Azure container
        return res.json(image);
    } catch (error) {
        next(error);
    }
}

app.post('/upload/file',singleFileUpload.single('file') ,imageUpload);

app.listen(port, () => console.log(`Azure Blob storage in single part App listening on port ${port} !`))


module.exports = app;
