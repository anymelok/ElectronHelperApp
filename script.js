const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');
const ffmpeg = require('fluent-ffmpeg');

const tempPath = 'D:/Screen Rec/!temp tip/';
let nowCompress = true;
let cancelFlag = false;


let options = {
    stdio: 'ignore',
    windowsHide: true
  };


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function compressOrStop() {
    if (nowCompress) {
        cancelFlag = false;
        compDelete()
    }
    else {
        cancelFlag = true;
    }

    nowCompress = !nowCompress;
}


function listDirectories(dirPath) {
    return fs.readdirSync(dirPath)
        .filter(file => fs.statSync(path.join(dirPath, file)).isDirectory())
        .filter(dir => dir !== '!temp tip');
}


async function compDelete() {
    const tempPath = 'D:/Screen Rec/!temp tip/';
    const files = fs.readdirSync(tempPath);
    const mp4Files = files.filter(file => file.endsWith('.mp4'));
    const compButton = document.getElementById('comp');
    let lastProgress = 0;

    for (let i = 0; i < mp4Files.length; i++) {
        const file = tempPath + mp4Files[i];
        const output = `D:/Screen Rec/comp ${mp4Files[i]}`;

        await new Promise((resolve, reject) => {
            let ffmpegProcess = ffmpeg(file)
                .inputOptions([
                    '-hwaccel cuda',
                    '-hwaccel_output_format cuda',
                    '-extra_hw_frames 2'
                ])
                .outputOptions([
                    '-c:a copy',
                    '-c:v hevc_nvenc',
                    '-rc constqp',
                    '-qp 40',
                    '-qmin 2',
                    '-qmax 50',
                    '-keyint_min 1',
                    '-bf 0',
                    '-preset p7',
                    '-tune hq',
                    '-b:v 0',
                    '-g 300',
                    '-rc-lookahead 4',
                    '-keyint_min 1',
                    '-qdiff 30',
                    '-qcomp 0.9',
                    '-y'
                ])
                .on('progress', function(progress) {
                    // Крашнуть операцию, если флаг отмены
                    if (cancelFlag) {
                        ffmpegProcess.kill();
                        fs.unlinkSync(output);
                        compButton.style.backgroundPositionX = '-100px';
                        reject(new Error('Operation cancelled'));
                        return;
                    }

                    console.log('Processing: ' + progress.percent + '% done');

                    // Обновление прогресса операции на кнопке
                    if (Math.abs(progress.percent - lastProgress) >= 1) {
                        compButton.style.backgroundPositionX = `${-100 + progress.percent}px`;
                        lastProgress = progress.percent;
                    }
                })

                .on('end', function() {
                    console.log('Finished processing');
                    fs.unlinkSync(file);
                    // compButton.style.backgroundPositionX = '-100px';
                    resolve();
                })

                .on('error', function(err) {
                    console.log('An error occurred: ' + err.message);
                    compButton.style.backgroundPositionX = '-100px';
                    reject(err);
                })

                .saveToFile(output);
        });
    }

    
    cancelFlag = false;
    await new Promise(r => setTimeout(r, 1000));
    compButton.style.backgroundPositionX = '-100px';
}


async function noVoice(btnName) {
    // Когда вызывается с кнопки, оно посылает object кнопки в первом аргументе
    // Поэтому типа сброс значения на кнопку, я хз
    typeof(btnName) === 'object' ? btnName = 'novoice': null;
    const button = document.getElementById(btnName);

    button.style.backgroundPositionX = '-90px';

    const tempPath = 'D:/Screen Rec/!temp tip/';
    const files = fs.readdirSync(tempPath);
    const mp4Files = files.filter(file => file.endsWith('.mp4'));

    for (let i = 0; i < mp4Files.length; i++) {
        
        const folder = mp4Files[i].substring(0, mp4Files[i].indexOf('202') - 1);
        const file = tempPath + mp4Files[i];
        
        await new Promise((resolve, reject) => {
            let ffmpegProcess = ffmpeg(file)
                .outputOptions([
                    '-map 0:a:0',
                    '-map 0:v:0',
                    '-c copy'
                ])
                .on('end', function() {
                    console.log('Finished processing');
                    fs.unlinkSync(file); // delete original
                    button.style.backgroundPositionX = `${-100 + Math.floor(100 * (i+1) / mp4Files.length)}px`;
                    resolve();
                })
                .on('error', function(err) {
                    console.log('An error occurred: ' + err.message);
                    button.style.backgroundPositionX = '-100px';
                    reject(err);
                })
                .saveToFile(`D:/Screen Rec/${folder}/NoVoice ${mp4Files[i]}`);
        });
    }
    
    await new Promise(r => setTimeout(r, 1000));
    button.style.backgroundPositionX = '-100px';
}


async function lastToTemp() {
    const basePath = 'D:/Screen Rec/';
    const exceptions = ['!temp tip', 'desktop.ini'];
    const files = [];
    const directories = listDirectories(basePath);
    const button = document.getElementById('lasttotemp');

    fs.readdirSync(basePath)
        .filter(file => file.endsWith('.mp4'))
        .forEach(file => files.push(path.join(basePath, file)));

    directories.forEach(directory => {
        fs.readdirSync(path.join(basePath, directory))
            .filter(file => file.endsWith('.mp4'))
            .forEach(file => files.push(path.join(basePath, directory, file)));
    });

    const lastFile = files.reduce((a, b) => fs.statSync(a).ctime > fs.statSync(b).ctime ? a : b);
    console.log(lastFile);
    console.log(path.basename(lastFile).split('/'))

    try {
        fs.renameSync(lastFile, path.join(basePath, '!temp tip', path.basename(lastFile).split('/')[0]));
    } catch (err) {
        fs.renameSync(lastFile, path.join(basePath, '!temp tip', path.basename(lastFile).split('/')[2]));
    }

    button.style.backgroundPositionX = '0px';
    await new Promise(r => setTimeout(r, 500));
    button.style.backgroundPositionX = '-100px';
}


function lastNoVoice() {
    lastToTemp();

    noVoice(null, 'lastnov');
}


function voice() {
    fs.readdirSync(tempPath)
        .filter(file => file.endsWith('.mp4'))
        .forEach(file => {
            const filePath = path.join(tempPath, file);
            const folder = file.substring(0, file.indexOf('202') - 1);
            execSync(`ffmpeg -i "${filePath}" -map 0:a:1 -map 0:v:0 -c copy "D:/Screen Rec/${folder}/NoVoice ${file}"`, options);
            fs.unlinkSync(filePath);
        });
}