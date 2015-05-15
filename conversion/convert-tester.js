(function() {


var requests = [], // Track requests.
    initiated = false,
    stopped = false,
    showingResults = false;

function set_status(msg) {
  $("#status").text(msg);
}

// Update replay file row.
function update_row(id, status) {
  if (!showingResults) {
    showingResults = true;
    $("#no-results").hide();
    $("#results").show();
  }
  var $rowStatus = $("#" + id + " td:nth-child(2)");
  if ($rowStatus.length === 0) {
    $("#results table").append("<tr id=\"" + id + "\"><td>" + id + "</td><td>" + status + "</td></tr>");
  } else {
    $rowStatus.text(status);
  }
}

// Start testing.
$("#start").click(function() {
  if (initiated) return;
  initiated = true;
  stopped = false;

  $("#start").prop("disabled", true);
  $("#stop").prop("disabled", false);
  // Used for testing conversion on a number of replays.
  // Path to the file containing a JSON array of replay filenames.
  var replayFile = "replays.json";
  // Relative path of the replays referenced in the above file.
  var path = "..\\data\\";
  // Total duration used for conversion.
  var total = 0;
  var replaysConverted = 0;
  $.getJSON(replayFile, function(replays) {
    if (stopped) return;
    set_status("Replays retrieved.");
    // Limit number of replays for debugging.
    replays = replays.slice(0, 3);
    replays.forEach(function(name, i) {
      var id = name.replace(/\.json|\.txt/, '');
      update_row(id, "Loading.");
      var xhr = $.getJSON(path + name, function(data) {
        if (stopped) return;
        var replay = {
          name: name,
          data: data
        };
        var start = performance.now();
        update_row(id, "Converting.");
        convertReplay(replay, function(err) {
          if (stopped) return;
          replaysConverted++;
          var end = performance.now();
          var duration = end - start;
          if (err) {
            console.log("Replay " + name + " had error.");
            update_row(id, "Error.");
          } else {
            console.log("Done with replay " + i + " in " + duration.toFixed(2) + " ms.");
            update_row(id, "Done in " + duration.toFixed(2) + " ms.");
          }
          total += duration;
          if (replaysConverted === replays.length) {
            set_status("Done with " + replays.length + " replays in " + total.toFixed(2) + " ms.");
            //console.log("Total duration for conversion of " + replays.length +
            //  " replays: " + total + " ms.");
          }
        });
      });
      requests.push(xhr);
    });
  });
});

// Stop testing.
$("#stop").click(function() {
  if (!initiated) return;
  initiated = false;
  stopped = true;
  $("#stop").prop("disabled", true);
  $("#start").prop("disabled", false);
  // Abort pending XHR requests.
  requests.forEach(function(request) {
    request.abort();
  });
});

})();
