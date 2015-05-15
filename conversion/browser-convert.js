// Holds all the main conversion functions.
/**
 * Exposes the convertReplay function, which handles converting
 * replays.
 */
(function(window) {

// Holds the replay migration functions.
var conversion = new Migrations();

// Return the first value in the array that satisfies the given function.
// same functionality as `find`.
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

// Takes a replay and returns the integer version of it.
function getReplayVersion(data) {
  if (!data.hasOwnProperty("version")) {
    return 1;
  } else {
    return data.version;
  }
}

// Get replay info from players and into object from v1 to v2 replay format.
function get_info(name, data) {
  var info = {};
  var replayId = name.replace(/\.(txt|json)$/, '');
  info.dateRecorded = parseReplayId(replayId) || Date.now();
  info.name = replayId.replace(/DATE.*/, '');

  // Default values.
  info.teamNames = {
    "1": "Red",
    "2": "Blue"
  };

  // Get player objects.
  var playerKeys = Object.keys(data).filter(function(key) {
    return key.search('player') === 0;
  });
  
  // Get information from players.
  playerKeys.forEach(function(key) {
    var player = data[key];
    var id = Number(key.replace('player', ''));
    // Replay information stored in players.
    info.fps = info.fps || player.fps;
    info.mapName = info.mapName || player.map;

    if (player.me == "me") {
      info.player = info.player || id;
    }
  });

  return info;
}

// Convert datestring to epoch time (ms).
function strToTime(str) {
  return (new Date(str)).getTime();
}

// Holds functions that convert each of the properties from version 1
// of the replay format to version 2.
var Convert = {
  // Takes a single spawn from the spawns property..
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
  // Takes chat object. Returns null if chat is invalid.
  chat: function(data) {
    // Handle incomplete chat objects from TagPro 3.0 bug.
    if (!data.hasOwnProperty('removeAt')) return null;
    // Ignore sound messages that were populated into chat.
    if (data.hasOwnProperty('s') && data.hasOwnProperty('v')) return null;
    var obj = {
      from: data.from,
      message: data.message,
      to: data.to,
      time: data.removeAt - 30000,
    };
    if (data.hasOwnProperty("c")) obj.color = data.c;
    if (data.hasOwnProperty("mod")) obj.mod = data.mod;
    return obj;
  },
  // Takes the player id and player object.
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
    // Ignore properties that don't exist. Required properties are
    // known to be present due to validation against schema prior to
    // conversion.
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
      // Handles previous version of replay that only had the initial
      // value of gameEndsAt.
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
function get_data(name, data) {
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

// Convert from version 1 to 2 of replay.
// Takes data with name and data properties which is the filename/id and
// replay data, respectively.
conversion.add(1, 2, function(data, callback) {
  // Validate replay before applying conversion.
  validateReplay(data.data, function(valid) {
    if (!valid) {
      callback(!valid);
    } else {
      var parsed_info = get_info(data.name, data.data);
      // Convert replay data.
      var parsed_data = get_data(data.name, data.data);
      var replay = {
        info: parsed_info,
        data: parsed_data,
        version: "2"
      };
      // Set as data property.
      data.data = replay;
      // Ran successfully.
      callback();
    }
  });
});

// Current replay version.
var CURRENT = 2;

/**
 * Callback used when converting a replay.
 * @callback ConversionCallback
 * @param {Error} err - Truthy if an error occurred during conversion.
 */
/**
 * @typedef {ReplayData}
 * @property {Replay} data - The actual Replay, as specified in the
 *   replay schema.
 * @property {string} name - The name of the replay. This can correspond
 *   to the filename of an imported replay or the primary key of a
 *   database-stored replay.
 */
/**
 * Convert a replay object.
 * @param {[type]} data [description]
 * @param {Function} callback [description]
 * @return {[type]} [description]
 */
window.convertReplay = function(data, callback) {
  // Get replay version.
  var version = getReplayVersion(data.data);
  // Get function to upgrade.
  var fn = conversion.getPatchFunction(version, CURRENT);
  if (fn) {
    // Upgrade data.
    fn(data, function(err) {
      if (err) {
        callback(err);
      } else {
        validateReplay(data.data, function(valid) {
          if (valid) {
            callback();
          } else {
            callback(new Error("Validation failed."));
          }
        });
      }
    });
  } else {
    callback();
  }
};

})(window);
