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
  console.log(subtitles);
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
function captureScreenshots(path, timeStamps) {
  if(path) {
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

// readSRT(callback);
//
// function readSRT(callback) {
//   if(argv.s) {
//
//     // read srt file
//     fs.readFile(argv.s, "utf-8", function (err,data) {
//
//       if (err) {
//         return console.err(err);
//       }
//
//       callback(data);
//
//     });
//
//   }
// }
//
// function callback (data) {
//   // initialize caption object
//   var captions = new subtitle();
//
//   // parse .srt file
//   captions.parse(data);
//
//   // create dir if needed
//   try {
//     fs.mkdirSync('bin');
//   }
//   catch (err) {
//     console.error(err);
//   }
//
//   console.log(captions.getSubtitles());
//
//   // write srt file
//   // fs.writeFile("bin/test.json", JSON.stringify(subtitles), function(err) {
//   //     if(err) {
//   //         return console.error(err);
//   //     }
//   //     console.log("The file was saved!");
//   // });
//

//
// }
