## @truffle/preserve-to-buckets

### Configuration
To preserve your files to Textile Buckets, you will need to install [Textile's `hub` tool](https://docs.textile.io/hub/), register and create authentication keys.

```
hub init
hub keys create
 - account
 - Require Signature Authentication (recommended): N
```

Then you need add these keys as well as a bucket name to an environment in your `truffle-config.js`

```js
module.exports = {
    environments: {
        development: {
            buckets: {
                key: "MY_BUCKETS_KEY",
                secret: "MY_BUCKETS_SECRET",
                bucketName: "truffle-preserve-bucket",
            }
        }
        // ... other environments
    }
    // ... rest of your truffle-config
};
```
