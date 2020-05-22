var express = require('express');
const app = express();
var bodyParser = require('body-parser');
var fs = require('fs')
// var environment = require('../enviornment')
var cors = require('cors');
var path = require('path');

var multer = require('multer');
const inMemoryStorage = multer.memoryStorage();
const singleFileUpload = multer({
    storage: inMemoryStorage
});
var azureStorage = require('azure-storage');
var getStream = require('into-stream');
// const _crypto = require('crypto');
// var algorithm = 'aes-256-ctr';


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
    containerName: "testing-container"
};



// function uploadLoadToS3(ObjFile) {

//     var params = {
//         // ACL: 'public-read',
//         Body: new Buffer(ObjFile.buffer),
//         Bucket: 'chunkdemo',
//         ContentType: ObjFile.type,
//         Key: ObjFile.originalname
//     }
//     console.log(params);
//     return s3.upload(params).
//     on('httpUploadProgress', function (progress) {
//         console.log(progress);
//     }).promise();
// }







async function uploadFileToBlob(directoryPath, file) {
    console.log("file---", file)

    var arr = [];
    let files = file;
    // var buffer = fs.readFileSync(file.buffer);
    return new Promise((resolve, reject) => {



        var encfile = new Buffer(file.buffer);

        const exe = files.originalname.split('.');
        const name = path.basename(files.originalname, "." + exe[exe.length - 1]);
        files.originalname = name + '-' + Date.now();
        var startTime = new Date();
        var partNum = 0;
        var dynamicpartsize = encfile.length / 3;

        var partSize = dynamicpartsize;
        var numPartsLeft = Math.ceil(encfile.length / partSize);
        var maxUploadTries = 3;


        console.log('Creating multipart upload for:', file.originalname);
        var promises = [];

        var bufferremain = encfile.length;
        var size = 0;
        var i = 1;

        for (var start = 0; start < encfile.length; start += partSize, i++) {
            partNum++;
            var end = Math.min(start + partSize, encfile.length);
            size = bufferremain > partSize ? partSize : bufferremain;
            var partParams = {
                fieldName: files.fieldname,
                originalname: files.originalname + '_' + i + '.' + exe[exe.length - 1],
                buffer: encfile.slice(start, end),
                headers: file.headers,
                size: size,
                name: file.originalname,
                type: file.mimetype
            };

            if (bufferremain > partSize)
                bufferremain -= partSize;
            promises.push(blobcreate(partParams));

            // console.log('Uploading part: #', partParams.PartNumber, ', Start:', start);
            // uploadPart(s3, multipart, partParams);
        }
        // });

        // function encryptstream(buffer, masterkey) {
        //     var cipher = _crypto.createCipher(algorithm, masterkey)
        //     var crypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        //     return crypted;
        // }
        Promise.all(promises).then(function (data) {
            console.log('Uploadedd', data);
            resolve(data);
            var delta = (new Date() - startTime) / 1000;
            console.log('Completed upload in', delta, 'seconds');

        }).catch(function (err) {
            // res.send(err.stack);
            console.log(err)
        })

        function blobcreate(ObjFile) {
            return new Promise((resolve, reject) => {
                const blobName = getBlobName(ObjFile.originalname);
                const stream = getStream(ObjFile.buffer);
                const streamLength = Math.ceil(ObjFile.buffer.length);

                const blobService = azureStorage.createBlobService(azureStorageConfig.accountName, azureStorageConfig.accountKey);
                blobService.createBlockBlobFromStream(azureStorageConfig.containerName, `${directoryPath}/${blobName}`, stream, streamLength, err => {

                    if (err) {
                        reject(err);
                    } else {

                        var dataobj = {
                            filename: blobName,
                            originalname: ObjFile.originalname,
                            size: streamLength,
                            path: `${azureStorageConfig.containerName}/${directoryPath}/${blobName}`,
                            url: `${azureStorageConfig.blobURL}${azureStorageConfig.containerName}/${directoryPath}/${blobName}`
                        }
                        // arr.push(dataobj)
                        console.log("-------1", dataobj)
                        // arr.push(dataobj)
                        resolve(dataobj)
                        console.log("upload file successfully-----");

                    }
                });
            });
        }
    });

};

const getBlobName = originalName => {
    const identifier = Math.random().toString().replace(/0\./, ''); // remove "0." from start of string
    return `${identifier}-${originalName}`;
};

const imageUpload = async (req, res, next) => {
    console.log("req :----------", req.file);

    try {
        const image = await uploadFileToBlob('files', req.file); // files is a directory in the Azure container
        return res.json(image);
    } catch (error) {
        next(error);
    }
}

app.post('/upload/file',singleFileUpload.single('file') ,imageUpload);

app.listen(port, () => console.log(`Azure Blob storage in single part App listening on port ${port} !`))


module.exports = app;