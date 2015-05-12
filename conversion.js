/*
 * Testing method for transforming items.
 */
var fs = require("fs");
var convert = require("./helpers");
var validate = require("./validate");

// Get data files.
var files = fs.readdirSync('data');
files = files.slice(0, 1);
// Test single file.
//var files = ['replays1420767162877.json'];

//files = files.slice(0, 20);
files.forEach(function(filename, i) {
  // Create info object from the above replay.
  fs.readFile('./data/' + filename, {encoding:"utf8"}, function(err, data) {
    if (err) throw err;
    data = JSON.parse(data);
    // Check that this is a valid replay, quit if not.
    var valid = validate(1, data);
    if (!valid) {
      console.log("Validation failed for " + filename);
      return;
    }

    // Try conversion.
    var result = convert(filename, data);
    if (result) {
      console.log(filename + " valid!");
      console.log(result.data.players);
      // Save replay.
      fs.writeFile('./newdata/new-' + filename, JSON.stringify(result), function(err) {
        if (err) {
          console.log("Error writing file: " + filename);
        }
      });
    } else {
      console.log("Conversion error for " + filename);
    }
    // Validate raw replay structure.
    /*var valid = validator.validate(data, require('./schemas/v1/data.json'));
    if (!valid) {
      var errors = validator.getLastErrors();
      console.log(i + " Invalid!");
      fs.open('./errors/' + filename + '.error', 'w', function(err, fd) {
        if (err) throw err;
        fs.write(fd, errors, function(err) {
          if (err) {
            console.log("Error writing errors for " + filename + '.');
          }
        });
      });
    } else {
      console.log(i + " Valid!");
    }*/
  });
});
