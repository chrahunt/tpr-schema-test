/*
 * Holds information for validating a replay. Replay validation is done
 * in two steps:
 * * Validation against the schema - ensures requirements on the
 *   structure and presence of properties are met.
 * * Content validation - verifies semantic integrity, e.g. presence of
 *   properties with specific values and presence of non-required
 *   properties that are required in specific cases.
 * The exported function takes the version to be checked against, the
 * data to check, and any options to be passed to the validator.
 */

(function(window) {

/**
 * Manage creation of schema validators and cache for calls.
 */
var ReplayValidator = function(logger) {
  this.logger = logger || console;
  this.validators = {};
};

// Get version for data.
ReplayValidator.prototype.getVersion = function(data) {
  if (!data.hasOwnProperty("version")) {
    return 1;
  } else {
    return data.version;
  }
};

/**
 * @callback ValidationCallback
 * @param {boolean} result - Whether the replay was valid.
 */
/**
 * Validate data.
 * @param {*} data - The data to validate.
 * @param {function} callback - The callback for the result of
 *   validation.
 */
ReplayValidator.prototype.validate = function(data, callback) {
  // Get replay version.
  var version = this.getVersion(data);

  if (!this.validators.hasOwnProperty(version)) {
    throw new Error("No validator with that version exists.");
  }
  var validator = this.validators[version];
  if (!validator.ready) {
    setTimeout(function() {
      this.validate(data, callback);
    }.bind(this), 50);
  } else {
    // Schema validation.
    var valid = validator.checkSchema(data, this.logger);
    if (!valid) {
      callback(valid);
    } else {
    // Requirements validation.
      valid = validator.checker(data, this.logger);
      callback(valid);
    }
  }
};

// Add information for validation
ReplayValidator.prototype.addVersion = function(version, data) {
  var validators = this.validators;
  validators[version] = {
    checker: data.checker,
    ready: false
  };
  // Get schema validator asynchronously.
  data.schemaValidator(function(validate) {
    validators[version].checkSchema = validate;
    validators[version].ready = true;
  });
};

var validator = new ReplayValidator();

validator.addVersion(1, {
  // Returns schema validation function which takes data and a logger
  // and outputs a boolean indicating whether the provided data passes
  // or fails.
  schemaValidator: function(callback) {
    var validator = new ZSchema(),
        loaded = [],
        main = "data.json",
        mainData,
        loadBarrier = new Barrier();
    // Set remote references after all relevant schemas have been
    // loaded.
    loadBarrier.onComplete(function() {
      loaded.forEach(function(schema) {
        validator.setRemoteReference(schema.name, schema.data);
      });
      var validate = function(data, logger) {
        var valid = validator.validate(data, mainData);
        if (!valid) {
          logger.log(validator.getLastErrors());
          return false;
        }
        return true;
      };
      callback(validate);
    });
    // Create validator.
    var schema_dir = "../schemas/1/";
    var names = ['data.json', 'player.json', 'definitions.json'];
    names.forEach(function(name) {
      var id = loadBarrier.start();
      $.getJSON(schema_dir + name, function(data) {
        if (name == main) {
          mainData = data;
        }
        loaded.push({
          name: name,
          data: data
        });
        loadBarrier.stop(id);
      });
    });
  },
  // Function that checks data against other requirements. Takes the data
  // and a logger.
  checker: function(data, logger) {
    // Validate other aspects of replay.
    // At least one player must exist.
    var playerKeys = Object.keys(data).filter(function(key) {
      return key.search('player') === 0;
    });

    // At least one player must have "me" value.
    if (playerKeys.length === 0) {
      logger.log("No valid players!");
      return false;
    }

    var playerExists = playerKeys.some(function(key) {
      return data[key].me == "me";
    });

    if (!playerExists) {
      logger.log("No player is main player.");
      return false;
    }
    return true;
  }
});

validator.addVersion(2, {
  schemaValidator: function(callback) {
    var validator = new ZSchema(),
        loaded = [],
        main = "replay.json",
        mainData,
        loadBarrier = new Barrier();
    // Set remote references after all relevant schemas have been
    // loaded.
    loadBarrier.onComplete(function() {
      loaded.forEach(function(schema) {
        validator.setRemoteReference(schema.name, schema.data);
      });
      var validate = function(data, logger) {
        var valid = validator.validate(data, mainData);
        if (!valid) {
          logger.log(validator.getLastErrors());
          return false;
        }
        return true;
      };
      callback(validate);
    });
    // Create validator.
    var schema_dir = "../schemas/2/";
    var names = ['data.json', 'db_info.json', 'definitions.json',
      'info.json', 'player.json', 'replay.json'];
    names.forEach(function(name) {
      var id = loadBarrier.start();
      $.getJSON(schema_dir + name, function(data) {
        if (name == main) {
          mainData = data;
        }
        loaded.push({
          name: name,
          data: data
        });
        loadBarrier.stop(id);
      });
    });
  },
  checker: function(data, logger) {
    // No players that were not present should be in the data.
    function playerExists(player) {
      return player.name.some(function(name) {
        return name !== null;
      });
    }
    var playerError = false;
    for (var id in data.players) {
      var player = data.players[id];
      playerError = !playerExists(player);
      if (playerError) {
        break;
      }
    }

    if (playerError) {
      logger.log("Unnecessary player object present.");
      return false;
    }
    
    return true;
  }
});

/**
 * Validate a replay against requirements.
 * @param {(number|string)} version - The version the replay should be
 *   tested against.
 * @param {object} data - The replay data to be tested
 * @param {ValidatorOptions} options - Options to be passed to the
 *   validation functions
 * @return {boolean} - True if the replay is valid, false otherwise.
 */
window.validateReplay = function(data, callback) {
  validator.validate(data, callback);
};

})(window);
