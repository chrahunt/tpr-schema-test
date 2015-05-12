// Holds all the main conversion functions.

var ZSchema = require("z-schema");

// Returns a validator for the current schemas.
function getValidator() {
  var validator = new ZSchema();
  var schemas = ['data.json', 'db_info.json', 'definitions.json',
    'info.json', 'player.json', 'replay.json'];
  schemas.forEach(function(schema) {
  validator.setRemoteReference(schema,
    require('./schemas/' + schema));
  });
  return validator;
}

var validator = getValidator();

// Return the first value in the array that satisfies the given function.
// same functionality as `find`
function first(array, fn) {
  for (var i = 0; i < array.length; i++) {
    if (fn(array[i])) {
      return array[i];
    }
  }
}

// Get time from replay Id.
function parseReplayId(replayId) {
    return Number(replayId.replace('replays', '').replace(/.*DATE/, ''));
}

// Get info from replay corresponding to specified info object format.
// This is for the raw replay version, but a wrapper around this could create
// the database version.
// Throws error if issue.
function get_info(file_name, data) {
  var info = {};
  var replayId = file_name.replace(/\.(txt|json)$/, '');
  info.dateRecorded = parseReplayId(replayId) || Date.now();
  info.name = replayId.replace(/DATE.*/, '');

  // Default values.
  info.teamNames = {
    "1": "Red",
    "2": "Blue"
  };

  info.spectating = false;

  // Player-specific information.
  info.players = {};
  var playerKeys = Object.keys(data).filter(function(key) {
    return key.search('player') === 0;
  });
  
  playerKeys.forEach(function(key) {
    var player = data[key];
    var id = Number(key.replace('player', ''));
    var name = first(player.name, function(val) {
      return val !== null;
    });
    // Disregard player if they didn't have a name, this indicates
    // that they weren't actually present during the replay.
    if (!name) return;
    var team = first(player.team, function(val) {
      return val !== null;
    });

    var degree = first(player.degree, function(val) {
      return val !== null;
    });
    info.players[id] = {
      id: id,
      name: name,
      team: team,
      degree: degree
    };

    // Replay information stored in players.
    info.fps = info.fps || player.fps;
    info.mapName = info.mapName || player.map;

    if (player.me == "me") {
      info.player = info.player || id;
    }
  });

  // Data-derived values.
  info.duration = Math.round((1e3 / info.fps) * data.clock.length);
  return info;
}

// Get info from replay corresponding to specified info object for database.
function get_db_info(file_name, data) {
  var info = get_info(file_name, data);
  info.rendered = false;
  info.renderId = null;
  return info;
}

// Convert datestring to epoch time (ms).
function strToTime(str) {
  return (new Date(str)).getTime();
}

// Holds functions that convert from a previous version of the replay
// into a new version.
var Convert = {
  // Takes spawn from v1 replay.
  spawn: function(data) {
    return {
      x: data.x,
      y: data.y,
      team: data.t,
      wait: data.w,
      time: strToTime(data.time)
    };
  },
  // Takes bomb from v1 replay.
  bomb: function(data) {
    return {
      x: data.x,
      y: data.y,
      type: data.type,
      time: strToTime(data.time)
    };
  },
  // Takes splat from v1 replay.
  splat: function(data) {
    return {
      team: data.t,
      x: data.x,
      y: data.y,
      temp: data.temp || false,
      time: strToTime(data.time)
    };
  },
  // Takes chat from v1 replay. Returns null if chat is invalid.
  chat: function(data) {
    // Handle incomplete chat objects.
    if (!data.hasOwnProperty('removeAt')) return null;
    return {
      from: data.from,
      message: data.message,
      to: data.to,
      time: data.removeAt - 30000,
    };
  },
  // Takes the player id and player object from v1 replay.
  player: function(id, data) {
    // Get start of player presence, and replace leading zeros with
    // null.
    var start = 0;
    for (var i = 0; i < data.team.length; i++) {
      if (data.team[i] !== 0) {
        start = i;
        break;
      }
    }
    var player = {
      id: id
    };
    var props = ["angle", "auth", "bomb", "dead", "degree", "draw",
      "flag", "flair", "grip", "name", "tagpro", "team", "x", "y"];
    // Remove unneeded properties. Required properties are present due
    // to JSON Schema validation prior to conversion.
    props = props.filter(function(prop) {
      return data.hasOwnProperty(prop);
    });

    if (start !== 0) {
      var pre = [];
      for (var i = 0; i < start; i++) {
        pre.push(null);
      }
      props.forEach(function(prop) {
        player[prop] = pre.concat(data[prop].slice(start));
      });
    } else {
      props.forEach(function(prop) {
        player[prop] = data[prop];
      });
    }

    return player;
  },
  // Takes the gameEndsAt property value from v1 replay.
  gameEndsAt: function(time) {
    if (typeof time == "number") {
      // Possible previous version, only had time from initial value of
      // gameEndsAt.
      return [time];
    } else {
      var output = [];
      output.push(time[0]); // Initial value of gameEndsAt.
      if (time.length == 2) {
        // Convert message with properties startTime and time to the ms
        // timestamp corresponding to the next end time.
        output.push(strToTime(time[1].startTime) + time[1].time);
      }
      return output;
    }
  },
  // Takes a single floor tile from v1 replay.
  floorTile: function(tile) {
    return {
      value: tile.value,
      x: Number(tile.x),
      y: Number(tile.y)
    };
  }
};

// Get data converted from v1 to current.
function get_data(file_name, data) {
  var parsed = {};

  // Normal data.
  parsed.spawns = data.spawns.map(Convert.spawn);
  parsed.bombs = data.bombs.map(Convert.bomb);
  parsed.splats = data.splats.map(Convert.splat);
  parsed.chat = data.chat.map(Convert.chat).filter(function(val) {
    return val !== null;
  });
  parsed.time = data.clock.map(strToTime);
  parsed.score = data.score;
  parsed.wallMap = data.wallMap;
  parsed.map = data.map;
  parsed.dynamicTiles = data.floorTiles.map(Convert.floorTile);
  parsed.endTimes = Convert.gameEndsAt(data.gameEndsAt);

  // Players.
  parsed.players = {};
  var playerKeys = Object.keys(data).filter(function(key) {
    return key.search("player") === 0;
  });
  playerKeys.forEach(function(key) {
    var player = data[key];
    var id = Number(key.replace("player", ""));
    var valid = player.name.some(function(val) {
      return val !== null;
    });
    if (!valid) return;
    parsed.players[id] = Convert.player(id, player);
  });
  return parsed;
}

// Run conversion tests on provided data.
// Takes file name and replay data as object.
function convert(file_name, data) {
  var parsed_info = get_info(file_name, data);

  var valid;
  // Validate raw replay info.
  valid = validator.validate(parsed_info, require('./schemas/info.json'));
  if (!valid) {
    console.log(validator.getLastErrors());
    console.log("Raw info error.");
    return false;
  }

  var parsed_db_info = get_db_info(file_name, data);
  valid = validator.validate(parsed_db_info, require('./schemas/db_info.json'));
  if (!valid) {
    console.log(validator.getLastErrors());
    console.log("DB Info error.");
    return false;
  }

  var parsed_data = get_data(file_name, data);
  valid = validator.validate(parsed_data, require('./schemas/data.json'));
  if (!valid) {
    console.log(validator.getLastErrors());
    console.log("Data error.");
    return false;
  }

  var replay = {
    info: parsed_info,
    data: parsed_data,
    version: "2"
  };
  valid = validator.validate(replay, require('./schemas/replay.json'));
  if (!valid) {
    console.log(validator.getLastErrors());
    console.log("Data error.");
    return false;
  }
  return replay;
}

module.exports = convert;
