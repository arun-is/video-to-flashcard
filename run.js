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
  }));

  captureScreenshots(tuples.slice(0,10).map(value => value.start));
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
function captureScreenshots(timeStamps) {
  if(argv.v) {
    ffmpeg(argv.v)
      .screenshots({
        timestamps: timeStamps,
        filename: '%i.png',
        folder: 'bin'
      })
      .on('error', function(err) {
        console.log(err);
      });
  } else {
    console.error('no path given for video');
  }
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
