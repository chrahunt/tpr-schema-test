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
var ZSchema = require("z-schema");

/**
 * Manage creation of schema validators and cache for calls.
 */
var SchemaValidator = function(logger) {
  
  this.validators = {};
  this.factories = {};
};

/**
 * Validate data against a specific schema version.
 * @param {integer} version - The version of the schema against which to
 *   validate the data.
 * @param {*} data - The data to validate.
 * @return {[type]} [description]
 */
SchemaValidator.prototype.validate = function(version, data) {
  // body...
};
/**
 * Get the schema validator for a specific version
 * @param {[type]} version [description]
 * @return {[type]} [description]
 */
SchemaValidators.prototype.getVersion = function(version) {
  if (!this.validators.hasOwnProperty(version)) {
    this.validators[version] = this.factories[version].call(null);
  }
  return this.validators[version];
};

// Add function for creating a schema validator for the specified version.
SchemaValidators.prototype.addSchemaValidator = function(version, fn) {
  this.factories[version] = fn;
};

var schemas = new SchemaValidators();

schemas.addSchemaValidator(1, function() {
  // Create validator.
  var schema_dir = "./schemas/1/";
  var validator = new ZSchema();
  var schemas = ['data.json', 'player.json', 'definitions.json'];
  schemas.forEach(function(schema) {
    validator.setRemoteReference(schema,
      require(schema_dir + schema));
  });
  return validator;
});

schemas.addSchemaValidator(3, function() {
  var schema_dir = "./schemas/2/";
  var validator = new ZSchema();
  var schemas = ['data.json', 'db_info.json', 'definitions.json',
    'info.json', 'player.json', 'replay.json'];
  schemas.forEach(function(schema) {
  validator.setRemoteReference(schema,
    require(schema_dir + schema));
  });
  return validator;
});

/**
 * @typedef ValidatorOptions
 * @type {object}
 * @property {boolean} printErrors - Whether errors should be printed.
 */
// Functions that takes replay data and returns true indicating replay
// is valid or false otherwise.
var Validators = {
  "1": function(data, options) {
    function log_error(msg) {
      if (options.printErrors) {
        console.log(msg);
      }
    }

    var validator = schemas.getSchemaValidator(1);

    // Validate raw replay structure.
    var valid = validator.validate(data, require('./schemas/v1/data.json'));
    if (!valid) {
      log_error(validator.getLastErrors());
      return false;
    }

    // Validate other aspects of replay.
    // At least one player must exist.
    var playerKeys = Object.keys(data).filter(function(key) {
      return key.search('player') === 0;
    });

    // At least one player must have "me" value.
    if (playerKeys.length === 0) {
      log_error("No valid players!");
      return false;
    }

    var playerExists = playerKeys.some(function(key) {
      return data[key].me == "me";
    });

    if (!playerExists) {
      log_error("No player is main player.");
      return false;
    }
    return true;
  },
  "3": function(data, options) {
    function log_error(msg) {
      if (options.printErrors) {
        console.log(msg);
      }
    }

    var validator = schemas.getSchemaValidator(3);

    var valid = validator.validate(data, require('./schemas/data.json'));
    if (!valid) {
      log_error(validator.getLastErrors());
      return false;
    }

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
      log_error("Unnecessary player object present.");
      return false;
    }
    
    return true;
  }
};

/**
 * Validate a replay against requirements.
 * @param {(number|string)} version - The version the replay should be
 *   tested against.
 * @param {object} data - The replay data to be tested
 * @param {ValidatorOptions} options - Options to be passed to the
 *   validation functions
 * @return {boolean} - True if the replay is valid, false otherwise.
 */
var validate = function(version, data, options) {
  if (!Validators.hasOwnProperty(version))
    throw "Version not found.";
  options = options || { printErrors: true };
  return Validators[version].call(null, data, options);
};

module.exports = validate;
