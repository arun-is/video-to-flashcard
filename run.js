const argv = require('yargs').argv;
const fs = require('fs');
var Subtitle = require('subtitle');

if(argv.s) {

  fs.readFile(argv.s, "utf-8", function (err,data) {
  if (err) {
    return console.err(err);
  }

  var captions = new Subtitle();

  captions.parse(data);

  try {
    fs.mkdirSync('bin');
  }

  catch (err) {
    console.error(err);
  }
  
  fs.writeFile("bin/test.json", JSON.stringify(captions.getSubtitles({
    timeFormat: 'ms' // Set time format to milliseconds
  })), function(err) {
      if(err) {
          return console.error(err);
      }
      console.log("The file was saved!");
  });

});

}
