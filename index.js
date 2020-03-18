const core = require('@actions/core');
const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const klawSync = require('klaw-sync');
const { lookup } = require('mime-types');

const AWS_KEY_ID = core.getInput('aws_key_id', { required: true });
const SECRET_ACCESS_KEY = core.getInput('aws_secret_access_key', {
  required: true
});
const BUCKET = core.getInput('aws_bucket', { required: true });
const SOURCE_DIR = core.getInput('source_dir', { required: true });

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
      core.info(`located - ${data.Location}`);
      resolve(data.Location);
    });
  });
}
function run() {
  return Promise.all(
    paths.map(p => {
      const Key = p.path.replace(path.join(process.cwd(), SOURCE_DIR), objKey);
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
  .then(locations => {
    core.info(`object key - ${objKey}`);
    core.info(`object locations - ${locations}`);
    core.setOutput('object_key', objKey);
    core.setOutput('object_locations', locations);
  })
  .catch(err => {
    core.error(err);
    core.setFailed(err.message);
  });
