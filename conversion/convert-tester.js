(function() {


var requests = [], // Track requests.
    initiated = false,
    stopped = false,
    showingResults = false,
    convertedReplays = {}; // Hold converted replay data.

function downloadReplay(id) {
  if (convertedReplays.hasOwnProperty(id)) {
    var data = convertedReplays[id];
    var blob = new Blob([JSON.stringify(data)], { type: "application/json;charset=utf8" });
    saveAs(blob, id + ".json");
  } else {
    console.error("No replay to download.");
  }
}

// Download button click handler.
function downloadClick() {
  var id = $(this).closest("tr").attr("id");
  downloadReplay(id);
}

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
  var $resultsTable = $("#results table");
  var $rowStatus = $("#" + id + " td.status");
  if ($rowStatus.length === 0) {
    var $row = $("<tr>", { id: id }).appendTo($resultsTable);
    $("<td>", { class: "name" }).text(id).appendTo($row);
    $("<td>", { class: "status" }).text(status).appendTo($row);

    $download = $("<button>", { class: "download" })
      .text("Download")
      .appendTo($("<td>").appendTo($row));
    $download.click(downloadClick);
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
  set_status("Retrieving replays...");
  $.getJSON(replayFile, function(replays) {
    if (stopped) return;
    set_status("Replays retrieved.");
    // Limit number of replays for debugging.
    replays = replays.slice(0, 10);
    set_status("Converting replays.");
    replays.forEach(function(name, i) {
      var id = name.replace(/\.json|\.txt/, '');
      update_row(id, "Loading.");
      // Retrieve replay data.
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
            // Save edited replay as converted replay.
            convertedReplays[id] = replay.data;
          }
          total += duration;
          if (replaysConverted === replays.length) {
            set_status("Done with " + replays.length + " replays in " + total.toFixed(2) + " ms.");
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
