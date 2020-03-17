const core = require('@actions/core');
const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const klawSync = require('klaw-sync');
const { lookup } = require('mime-types');

const AWS_KEY_ID = core.getInput('aws-key-id', { required: true });
const SECRET_ACCESS_KEY = core.getInput('aws-secret-access-key', {
  required: true
});
const BUCKET = core.getInput('aws-bucket', { required: true });
const SOURCE_DIR = core.getInput('source-dir', { required: true });
const ENDPOINT_URL = core.getInput('s3-endpoint-url', { required: true });
const INDEX =
  core.getInput('index-document', { required: false }) || 'index.html';

const s3 = new S3({
  accessKeyId: AWS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY
});
const objKey = shortid();
const paths = klawSync(SOURCE_DIR, { nodir: true });

function upload(params) {
  return new Promise(resolve => {
    s3.upload(params, (err, data) => {
      if (err) core.error(err);
      core.info(`uploaded - ${data.Key}`);
      resolve();
    });
  });
}
function run() {
  return Promise.all(
    paths.map(p => {
      const Key = p.path.replace(SOURCE_DIR, objKey);
      const fileStream = fs.createReadStream(p.path);
      const params = {
        Bucket: BUCKET,
        ACL: 'public-read',
        Body: fileStream,
        Key,
        ContentType: lookup(p.path) || 'text/plain'
      };
      return upload(params);
    })
  );
}

run()
  .then(() => {
    core.setOutput('object-url', path.join(ENDPOINT_URL, objKey, BUCKET));
  })
  .catch(err => {
    core.error(err);
    core.setFailed(err.message);
  });
