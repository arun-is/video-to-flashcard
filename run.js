const argv = require('yargs').argv;
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const subtitle = require('subtitle');

var subtitles, promises = [];
promises.push(readSubtitle(argv.s))
promises.push(readSubtitle(argv.t));

// wait for both files to be read before continuing
Promise.all(promises).then(values => {

  // parse both subtitle files
  subtitles = values.map(value => parseSubtitle(value));

  createBin();

  var tuples = subtitles[0].map((value, index) => ({
    lang1: value.text,
    lang2: subtitles[1][index].text,
    start: value.start.replace(',', '.'),
    end: value.end.replace(',', '.'),
    index: value.index,
  }));

  captureScreenshots(tuples.slice(0,10).map(value => value.start));
  tuples.slice(0,10).map(tuple => captureVideo(tuple));
});

// return a promise of subtitle data given a path
function readSubtitle(path) {
  return new Promise((resolve, reject) => {
    if(path) {
      fs.readFile(path, 'utf-8', function (err,data) {
        if (err) {
          console.err(err);
          reject();
        }
        resolve(data);
      });
    } else {
      console.err('no path given for subtitle');
      reject();
    }
  });
}

// parse subtitle and return it as an array of objects
function parseSubtitle(data) {
  var captions = new subtitle();
  captions.parse(data);
  return captions.getSubtitles();
}

// given an array of timestamps and a path, print screenshots
function captureScreenshots(timestamps) {
  if(argv.v) {
    ffmpeg(argv.v)
      .screenshots({
        timestamps: timestamps,
        filename: '%i.png',
        folder: 'bin'
      })
      .on('error', function(err) {
        console.error(err);
      });
  } else {
    console.error('no path given for video');
  }
}

function captureVideo(tuple) {
  ffmpeg(argv.v)
    .setStartTime(tuple.start)
    .setDuration(convertToTimestamp(
      convertToMilliseconds(tuple.end) - convertToMilliseconds(tuple.start)
    ))
    .output(`bin/${tuple.index}.mp4`)
    .on('error', err => console.error(err))
    .run();
}

function createBin() {
  // check if directory exists, then create it
  if(!fs.existsSync('bin')) {
    try {
      fs.mkdirSync('bin');
    }
    catch (err) {
      console.error(err);
    }
  }
}


// add leading zeros to numbers and return as string
function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
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
