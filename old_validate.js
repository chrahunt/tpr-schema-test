/*
 * Validate the format of old replays against the old-replay-specific schemas.
 * Also makes it easy to find issues with the old replay schemas.
 */
var ZSchema = require("z-schema");
var fs = require("fs");

function test() {
  var validator = new ZSchema();
  var schemas = ['data.json', 'player.json', 'definitions.json'];
  schemas.forEach(function(schema) {
    validator.setRemoteReference(schema,
      require('./schemas/v1/' + schema));
  });

  var files = fs.readdirSync('data');
  files.forEach(function(filename, i) {
    // Create info object from the above replay.
    
    fs.readFile('./data/' + filename, {encoding:"utf8"}, function(err, data) {
      if (err) throw err;
      data = JSON.parse(data);
      // Validate raw replay structure.
      var valid = validator.validate(data, require('./schemas/v1/data.json'));
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
      }
      // Validate raw replay data.
      // At least one player has to have 'me'
      // At least one player has to have 'fps'
      // At least one player has to have...
    });
  });
}

test();
