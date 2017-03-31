const argv = require('yargs').argv;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const mapLimit = require('promise-map-limit');
const subtitle = require('subtitle');

const directory = 'bin';

const videoBatchSize = 2;

// verify that all params are provided
if(!argv.v) {
  console.error('no video provided');
}
if(!argv.s) {
  console.error('no primary subtitle provided');
}
if(!argv.t) {
  console.error('no secondary subtitle provided');
}

// create directory if needed
createDir();

var subtitles, promises = [];
promises.push(readSubtitle(argv.s))
promises.push(readSubtitle(argv.t));

// wait for both files to be read before continuing
Promise.all(promises)
  .then(simplifySubtitles)
  .then(captureScreenshots)
  .then(createCSV)
  .then(captureVideos);

// return a promise of subtitle data given a path
function readSubtitle(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', function (err,data) {
      if (err) {
        console.error(err);
        reject();
      }
      resolve(data);
    });
  });
}

// parse subtitle and return it as an array of objects
function parseSubtitle(data) {
  var captions = new subtitle();
  captions.parse(data);
  return captions.getSubtitles();
}

function simplifySubtitles(values) {
  return new Promise((resolve, reject) => {
    subtitles = values.map(value => parseSubtitle(value));

    // create reduced tuples with subtitle information
    var tuples = subtitles[0].map((value, index) => ({
      lang1: value.text,
      lang2: subtitles[1][index].text,
      start: value.start.replace(',', '.'),
      end: value.end.replace(',', '.'),
      index: value.index,
    }));

    tuples = tuples.slice(0, 10);

    resolve(tuples);
  });
}

// given an array of timestamps and a path, print screenshots
function captureScreenshots(tuples) {
  return new Promise((resolve, reject) => {
    var timestamps = tuples.map(value => value.start);
    ffmpeg(argv.v)
      .screenshots({
        timestamps: timestamps,
        filename: '%i.jpg',
        folder: directory
      })
      .on('error', err => {
        console.error(err);
        reject();
      })
      .on('end', args => {
        resolve(tuples);
      });
  });

}

function captureVideos(tuples) {
  return new Promise((resolve, reject) => {
    mapLimit(tuples, videoBatchSize, captureSingleVideo).then(results => {
      resolve(tuples);
    });
  });
}

function captureSingleVideo(tuple) {
  return new Promise((resolve, reject) => {
    ffmpeg(argv.v)
      .setStartTime(tuple.start)
      .setDuration(convertToTimestamp(
        convertToMilliseconds(tuple.end) - convertToMilliseconds(tuple.start)
      ))
      .size('50%')
      .output(`${directory}/${tuple.index}.mp4`)
      .on('error', err => {
        console.error(err);
        reject();
      })
      .on('end', args => {
        resolve();
      })
      .run();
  });
}

// create and save CSV file
function createCSV(tuples) {
  return new Promise((resolve, reject) => {
    var csv = '1 Text,1 Image,2 Text,2 Video\n';
    csv += tuples.reduce((acc, val) => acc += `"${val.lang1}",${val.index}.jpg,"${val.lang2}",${val.index}.mp4\n`, '');
    csv = csv.trim();

    // write csv file
    fs.writeFile(`${directory}/Data.csv`, csv, function(err) {
        if(err) {
            console.error(err);
            reject();
        }
        resolve(tuples);
    });
  });
}

function createDir() {
  // check if directory exists, then create it
  if(!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory);
    }
    catch (err) {
      console.error(err);
    }
  }
}


// add leading zeros to numbers and return as string
function pad(num, size) {
    var s = num+'';
    while (s.length < size) s = '0' + s;
    return s;
}

// convert milliseconds to timestamp
function convertToTimestamp(time) {
  var hours = Math.floor(time / (60*60*1000));
  time -= hours * 60*60*1000;

  var minutes = Math.floor(time / (60*1000));
  time -= minutes * 60*1000;

  var seconds = Math.floor(time / 1000);
  time -= seconds * 1000;

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(time, 3)}`;
}

// convert timestamp to milliseconds
function convertToMilliseconds(timestamp) {
  var numbers = timestamp.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  var [stamp, hours, minutes, seconds, milliseconds] = numbers.map(number => parseInt(number));
  return ((((hours * 60) + minutes) * 60) + seconds) * 1000 + milliseconds;
}
