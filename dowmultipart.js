const { BlobServiceClient ,StorageSharedKeyCredential} = require("@azure/storage-blob");
var fs = require('fs')
var path = require('path');
const account = "edexabackup";
const accountKey="CK4r5uFRsmw1gchZXyJ70k3yl1JrDqYsUY1lyblC03ruBh4hFk4RN2NpXeJCWHTFWuL9j+cVMHz4bj0SX+3hsQ==";
var sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
var blobURL= "https://edexabackup.blob.core.windows.net/";
var containerName ="testing-container";

var blobServiceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  sharedKeyCredential
);
var azurestorage={
    containerName:"archive-api"
}
var containerName = "testing-container";
var files = ["5252481969267049-image1-2-1585557638113_1.png", "06421424232050321-image1-2-1585557638113_2.png","8660339001289639-image1-2-1585557638113_3.png"];


async function main() {
return new Promise((resolve,reject)=>{
    var promises = [];
    var exe, name;
    for (var start = 0; start < files.length; start++) {

        if (start == 0) {
            exe = path.basename(files[start]).split('.');
            name = path.basename(path.basename(files[start]), "." + exe[exe.length - 1]);
        }
        var partParams = {
            blobName: path.basename(files[start])
        };
        promises.push(downloadtoazure(partParams));
    } 
    Promise.all(promises).then( async function(values) {
          console.log(values);
        var buffer = Buffer.concat(
            values.map(x => x[0])
        );
            const blobName = getBlobName(files.name);
            const stream = getStream(buffer);
                
            const streamLength =  Math.ceil(buffer.length);
            const blobService = azureStorage.createBlobService(account, accountKey); 
            blobService.createBlockBlobFromStream(azurestorage.containerName, `${blobName}`, stream, streamLength, err => {
                if (err) {
                        reject(err); 
                } else {
                    resolve({ filename: blobName, 
                        originalname: file.originalname, 
                        size: streamLength, 
                        path: `${azurestorage.containerName}/${blobName}`,
                        url: `${blobURL}${azurestorage.containerName}/${blobName}` });
                        console.log("upload file successfully-----");
                    }
                });
         
    }).catch(function (err) {
        console.log(err)
    })
    
      async function downloadtoazure(blobName){
        
         var downloadBlockBlobResponse =[];
         var chunks=[]
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient=containerClient.getBlobClient(blobName.blobName);
        downloadBlockBlobResponse.push(await blobClient.downloadToBuffer());
        return(downloadBlockBlobResponse)
        
      }
})
   
    
}
const getBlobName = originalName => {
    const identifier = Math.random().toString().replace(/0\./, ''); // remove "0." from start of string
    return `${identifier}-${originalName}`;
};


 
main();

