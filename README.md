# AsyncTaskManager

A task manager for orchestrating tasks with pre-requisites and resource requirements.

This is probably easier to explain by example. Consider a "file uploader" where each file has to be hashed (and the hash stored) and uploaded only after hashing. However to avoid locking up the UI, there can be at most one hashing task (done progressively), and at most three simultaneous uploads (for whatever reason). This can be readily achieved within the `AsyncTaskManager` framework:

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
    - [Throttled Dispatch Setup](#throttled-dispatch-setup)
    - [Debug](#debug)

<!-- /MarkdownTOC -->


## Install

### npm Package

This is available as [`async-task-manager`](https://www.npmjs.com/package/async-task-manager) on [npm](https://www.npmjs.com/). (Install with `npm install async-task-manager`.)

## Usage By Example

### Set Up

[underscore](http://underscorejs.org/) has to be injected as a dependency.

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

```javascript
files.forEach(fileInfo => {
    const hashingPromise = asyncTaskManager.addTask({
        task: function hashFile({ fileInfo }) {
            return doHash(fileInfo);
        },
        inputs: {
            fileInfo: fileInfo  // not a Promise just a value
        },
        resources: {
            'concurrent-hashing': 1
        },
    });

    asyncTaskManager.addTask({
        task: function uploadFile({ hash, fileInfo }) {
            return doUploadAndIndicateHash(fileInfo, hash);
        },
        inputs: {
            hash: hashingPromise,  // a Promise (used as pre-requisite)
            fileInfo: fileInfo     // not a Promise just a value (used as parameter)
        },
        resources: {
            'concurrent-upload': 1
        },
    });
});
```

### "Visibility"

```javascript
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

```javascript
asyncTaskManager.DEBUG_MODE = true
```
