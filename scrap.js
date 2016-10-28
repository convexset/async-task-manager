const asyncTaskManager = createAsyncTaskManager({
    resources: {
        'concurrent-upload': 3,
        'concurrent-hashing': 1
    }
});



const uploadProgress = files.map(fileInfo => {
    const hashingPromise = asyncTaskManager.addTask({
        id: `hash-${fileInfo.filename}`,  // id is randomly generated if omitted
        task: function hashFile({ fileBytes }) {
            return doHash(fileBytes);
        },
        inputs: {
            fileBytes: fileInfo.bytes  // not a Promise just a value
        },
        resources: {
            'concurrent-hashing': 1
        },
    });

    // additional tasks
    const otherPrepPromise = asyncTaskManager.addTask({
        id: `prep-${fileInfo.filename}`,  // id is randomly generated if omitted
        task: function otherPrep() {
            return doPrep(fileInfo);
        }
    });
    const morePrepPromise = asyncTaskManager.addTask({
        id: `more-prep-${fileInfo.filename}`,  // id is randomly generated if omitted
        task: function extraPrep({ prep }) {
            return doMorePrep(prep);
        },
        inputs: {
            prep: otherPrepPromise  // a Promise (used as pre-requisite)
        },
    });

    // the upload
    const uploadPromise = asyncTaskManager.addTask({
        id: `upload-${fileInfo.filename}`,  // id is randomly generated if omitted
        task: function uploadFile({ hash, fileHandle }) {
            return doUploadAndIndicateHash(fileInfo, hash);
        },
        inputs: {
            hash: hashingPromise,        // a Promise (used as pre-requisite)
            prep: morePrepPromise,       // a Promise (used as pre-requisite)
            fileHandle: fileInfo.handle  // not a Promise just a value (used as parameter)
        },
        resources: {
            'concurrent-upload': 1
        },
    });

    return {
        fileInfo: fileInfo,
        hashingPromise: hashingPromise,
        uploadPromise: uploadPromise
    };
});