const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const genIndex = require('./genIndex')
const genAlbum = require("./genAlbum")
const exifReader = require('exif-reader');

const inputDir = path.join(__dirname, '../photos');
const outputDir = path.join(__dirname, '../build');

async function processImage(inputPath, outputPath, smallSize) {
    // 如果文件已存在，则跳过处理
    if (await fs.pathExists(outputPath)) {
        const metadata = await sharp(inputPath).metadata();
        const data = metadata.exif ? exifReader(metadata.exif) : null;
        return {
            width: metadata.width,
            height: metadata.height,
            exif: data ? {
                // 相机型号
                "Model": data.image.Model || '',
                // 生成时间                   
                "Time": data.exif.DateTimeOriginal.toLocaleString('zh-cn', { timeZone: 'UTC' }) || '',
                // 光圈F值       
                "FNumber": data.exif.FNumber || '',
                // 焦距                        
                "focalLength": data.exif.FocalLengthIn35mmFormat || '',
                // 感光度
                "ISO": data.exif.ISO || '',
                // 快门速度
                "speed": ('1/' + Math.round(Math.pow(2, data.exif.ShutterSpeedValue))) || ''
            } : null
        };
    }

    await fs.ensureDir(path.dirname(outputPath));

    // 复制原始图片
    await fs.copyFile(inputPath, outputPath);

    // 获取图像尺寸信息
    const metadata = await sharp(inputPath).metadata();

    // 创建缩小的图片
    const outputPathSmall = outputPath.replace('.jpg', '-small.jpg');
    await sharp(inputPath)
        .resize(smallSize)
        .toFile(outputPathSmall);

    const data = metadata.exif ? exifReader(metadata.exif) : null;

    return {
        width: metadata.width,
        height: metadata.height,
        exif: data ? {
            // 相机型号
            "Model": data.image.Model || '',
            // 生成时间                   
            "Time": data.exif.DateTimeOriginal.toLocaleString('zh-cn', { timeZone: 'UTC' }) || '',
            // 光圈F值       
            "FNumber": data.exif.FNumber || '',
            // 焦距                        
            "focalLength": data.exif.FocalLengthIn35mmFormat || '',
            // 感光度
            "ISO": data.exif.ISO || '',
            // 快门速度
            "speed": ('1/' + (2 ^ data.exif.ShutterSpeedValue)) || ''
        } : null
    };
}

async function processAlbum(albumPath, outputAlbumPath, defaultThumbnail, config, buildPath, albumName) {
    const files = await fs.readdir(albumPath);
    const jpgFiles = files.filter(file => file.endsWith('.jpg'));

    const imageSizeInfo = [];



    for (let i = 0; i < jpgFiles.length; i++) {
        const file = jpgFiles[i];
        const inputPath = path.join(albumPath, file);
        const outputPath = path.join(outputAlbumPath, file);

        // 处理图片，创建缩小版本
        const dimensions = await processImage(inputPath, outputPath, 400);
        if (dimensions) {
            imageSizeInfo.push({
                name: path.parse(file).name,
                src: file,
                smallsrc: file.replace('.jpg', '-small.jpg'),
                size: "" + dimensions.width + "x" + dimensions.height,
                width: dimensions.width,
                height: dimensions.height,
                exif: dimensions.exif
            });
        }

        // 将第一张图片设置为缩略图
        if (i === 0) {
            const thumbnailOutputPath = path.join(outputAlbumPath, 'thumbnail.jpg');
            if (!(await fs.pathExists(thumbnailOutputPath))) {
                await fs.copyFile(outputPath.replace('.jpg', '-small.jpg'), thumbnailOutputPath);
            }
        }
    }

    genAlbum(imageSizeInfo, config, buildPath, albumName)
}

async function main(config, buildPath) {
    const albums = await fs.readdir(inputDir);

    genIndex(albums, config, buildPath)

    for (const album of albums) {
        console.log("album:", album)
        const albumPath = path.join(inputDir, album);
        const outputAlbumPath = path.join(outputDir, album);



        if ((await fs.stat(albumPath)).isDirectory()) {
            await processAlbum(albumPath, outputAlbumPath, null, config, buildPath, album);
        }
    }
}

module.exports = function (config, buildPath) {
    main(config, buildPath)
        .then(() => console.log('处理完成'))
        .catch(err => console.error('处理出错:', err));
}