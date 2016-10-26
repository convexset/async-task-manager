# AsyncTaskManager

A task manager for orchestrating tasks with pre-requisites and resource requirements.
It enables clean code by enabling "keyword arguments" from pre-requisites.

By way of example, consider a "file uploader" where each file has to be hashed (and the hash stored) and uploaded only after hashing.
However to avoid locking up the UI, there can be at most one hashing task (done progressively), and at most three simultaneous uploads (for whatever reason).
This can be readily achieved within the `AsyncTaskManager` framework:

 - Each hash task is a pre-requisite to the corresponding upload task (tasks may have zero or more pre-requisites)
 - The queue might have a resource availability description of `{'concurrent-hash': 1, 'concurrent-upload': 3}`
 - Each hash task requires 1 `"concurrent-hash"` item (holds it on task initiation and releases it on completion)
 - Each upload task requires 1 `"concurrent-upload"` item (holds it on task initiation and releases it on completion)

## Table of Contents

<!-- MarkdownTOC -->

- [Install](#install)
    - [npm Package](#npm-package)
- [Usage By Example](#usage-by-example)
    - [Set Up](#set-up)
    - [Task Creation](#task-creation)
    - ["Visibility"](#visibility)
    - [Pausing the Dispatch of New Tasks](#pausing-the-dispatch-of-new-tasks)
    - [Throttled Dispatch Setup](#throttled-dispatch-setup)
    - [Debug](#debug)

<!-- /MarkdownTOC -->


## Install

### npm Package

This is available as [`async-task-manager`](https://www.npmjs.com/package/async-task-manager) on [npm](https://www.npmjs.com/). (Install with `npm install async-task-manager`.)

## Usage By Example

### Set Up

Note that [`underscore`](http://underscorejs.org/) has to be injected as a dependency.

```javascript
const _ = require('underscore');
const createAsyncTaskManager = require('async-task-manager')(_);

const asyncTaskManager = createAsyncTaskManager({
    resources: {
        'concurrent-upload': 3,
        'concurrent-hashing': 1
    }
});
```

### Task Creation

Here is a simple example of task creation:

```javascript
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
```

Note that tasks can be added at any time.

 - The promises that are returned by `asyncTaskManager.addTask` can be handed off to other parts of an application, and promises from various parts of an application can be used as inputs.
 - A single object argument will be passed into the `task` function when it is "dispatched", and its keys will match those of `inputs` argument key, with promises being replaced by the values they resolve to, and non-promise values being passed in as is.
- The `resources` key provides information on the 
- The `id` key is an optional id that may come in useful in the event that an the task or something it depends on throws an exception or "rejects".

When a "reject" is "caught" as an argument `e`, `e.errors` will be an array of objects of the following form:

```javascript
{
    input: 'nameOfInputKey',
    taskId: 'id-of-task',
    error: /* actual source error */
}
```

Using the above as an example, suppose `uploadPromise.catch(/* ... */)` snags something (`e`) due to an error in the prep task. Then `e.errors` might look like:

```javascript
[
    {
        input: 'prep'
        taskId: 'more-prep-somefile.pdf'
        error: /* the actual source error */
    },
    {
        input: 'prep'
        taskId: 'upload-somefile.pdf'
    },
]
```

### "Visibility"

To view total resource availability and current resource availability, use:

```javascript
console.log('Total Resource Availability:', asyncTaskManager.totalResources);
console.log('Current Resource Availability:', asyncTaskManager.currentResources);
```

To list active or pending tasks:

```javascript
console.log('Active Tasks:', asyncTaskManager.activeTasks);
console.log('Pending Tasks:', asyncTaskManager.pendingTasks);
```

### Pausing the Dispatch of New Tasks

To prevent pending tasks from being dispatched:

```javascript
asyncTaskManager.pauseDispatch = true;
```

To allow dispatch once more (and to trigger dispatch):

```javascript
asyncTaskManager.pauseDispatch = false;
```

### Throttled Dispatch Setup

It may be useful to limit the frequency that tasks are dispatched (e.g.: to play nice with the UI), and this may be done by adding a `dispatchThrottleIntervalInMs` option (defaults to `0` for no throttling).

```javascript
const _ = require('underscore');
const createAsyncTaskManager = require('async-task-manager')(_);

const asyncTaskManager = createAsyncTaskManager({
    resources: {
        'concurrent-upload': 3,
        'concurrent-hashing': 1
    },
    dispatchThrottleIntervalInMs: 50
});
```

To change the throttling interval:

```javascript
asyncTaskManager.setDispatchThrottleInterval(100);
```

### Debug

To have verbose console output of what goes on, simply set:

```javascript
asyncTaskManager.DEBUG_MODE = true;
```
