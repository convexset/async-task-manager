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
    - [Constructor](#constructor)
    - [Task Creation](#task-creation)
    - ["Visibility"](#visibility)
    - [Debug](#debug)

<!-- /MarkdownTOC -->


## Install

### npm Package

This is available as [`async-task-manager`](https://www.npmjs.com/package/async-task-manager) on [npm](https://www.npmjs.com/). (Install with `npm install async-task-manager`.)

## Usage By Example

### Constructor
```javascript
const asyncTaskManager = new AsyncTaskManager({
    resources: {
        hammers: 2,
        spanners: 1,
        pots: 3,
        pans: 8,
        // or... 'concurrent-upload': 3, 'concurrent-xxx': 2
    },
    dispatchThrottleInterval: 100
});
```

### Task Creation

```javascript
```

### "Visibility"

```javascript
```

### Debug

```javascript
asyncTaskManager.DEBUG_MODE = true
```
