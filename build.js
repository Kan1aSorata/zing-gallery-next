const my_config = require('./config')
const ejs = require('ejs');
const fs = require('fs');
const webpack = require('webpack');
const webpack_config = require('./webpack.config.js');
const path = require('path');

// build path
const buildPath = webpack_config.output.path;
if (!fs.existsSync(buildPath)) {
    fs.mkdirSync(buildPath);
}

require('./src/processPhotos')(my_config,buildPath)

webpack(webpack_config , (err, stats) => {
    if (err || stats.hasErrors()) {
        console.error(`Webpack error:`, err);
    }
    // 成功执行完构建
});

const srcDir = __dirname + "/src/public";
const destDir = buildPath;

fs.readdir(srcDir, (err, files) => {
  if (err) {
    console.error(`Error reading directory: ${err.message}`);
    return;
  }

  files.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);

    fs.stat(srcFile, (err, stats) => {
      if (err) {
        console.error(`Error reading file: ${err.message}`);
        return;
      }

      if (!stats.isFile()) {
        console.log(`Skipping non-file: ${srcFile}`);
        return;
      }

      fs.access(destFile, fs.constants.F_OK, err => {
        if (!err) {
          console.log(`File already exists, skipping: ${destFile}`);
          return;
        }

        fs.copyFile(srcFile, destFile, err => {
          if (err) {
            console.error(`Error copying file: ${err.message}`);
            return;
          }

          console.log(`Copied file: ${srcFile} to ${destFile}`);
        });
      });
    });
  });
});