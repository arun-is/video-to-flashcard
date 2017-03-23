const argv = require('yargs').argv;
const fs = require('fs');
const Subtitle = require('subtitle');
const ffmpeg = require('fluent-ffmpeg');

readSRT(callback);

function readSRT(callback) {
  if(argv.s) {

    // read srt file
    fs.readFile(argv.s, "utf-8", function (err,data) {

      if (err) {
        return console.err(err);
      }

      callback(data);

    });

  }
}

function callback (data) {
  // initialize caption object
  var captions = new Subtitle();

  // parse .srt file
  captions.parse(data);

  // create dir if needed
  try {
    fs.mkdirSync('bin');
  }
  catch (err) {
    console.error(err);
  }

  console.log(captions.getSubtitles());

  // write srt file
  // fs.writeFile("bin/test.json", JSON.stringify(subtitles), function(err) {
  //     if(err) {
  //         return console.error(err);
  //     }
  //     console.log("The file was saved!");
  // });

  ffmpeg(argv.v)
    .screenshots({
      timestamps: ['00:10.123', '10:20.123', '20:30.123'],
      filename: 'thumbnail-at-%s-seconds.png',
      folder: 'bin'
    })
    .on('error', function(err) {
      console.log(err);
    });

}
