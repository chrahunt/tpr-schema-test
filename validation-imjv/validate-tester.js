var showingResults = false;
var replayData = [];

// Given an id and a status, update a row.
function update_row(name, status) {
  var id = name.replace(/\.json|\.txt/, '');
  if (!showingResults) {
    showingResults = true;
    $("#no-results").hide();
    $("#results").show();
  }
  var $resultsTable = $("#results table");
  var $rowStatus = $("#" + id + " td.status");
  if ($rowStatus.length === 0) {
    var $row = $("<tr>", { id: id, class: "replay-row" }).appendTo($resultsTable);
    $("<td>", { class: "name" }).text(name).appendTo($row);
    $("<td>", { class: "status" }).text(status).appendTo($row);
  } else {
    $rowStatus.text(status);
  }
}

function showMessage(msg) {
  $('#message').text(msg);
  $('#message').fadeIn();
  setTimeout(function() {
    $('#message').fadeOut();
  }, 700);
}

$("#replay-input-clicker").click(function() {
  $("#replay-input").click();
});

$("#replay-input").change(function() {
  var files = $(this).get(0).files;
  if (files.length > 0) {
    var fileLoadBarrier = new Barrier();
    fileLoadBarrier.onComplete(function() {
      // Enable controls.
      $('#validate').prop("disabled", false);
      $('#reset').prop("disabled", false);

      // Confirmation.
      showMessage("Files Loaded");
    });
    // Reset replay data.
    replayData = [];
    // Load files.
    $.each(files, function(i, file) {
      var loadId = fileLoadBarrier.start();
      var fr = new FileReader();
      fr.onload = function(e) {
        var loaded = {
          name: file.name,
          data: JSON.parse(e.target.result)
        };
        replayData.push(loaded);
        update_row(loaded.name, "Loaded.");
        fileLoadBarrier.stop(loadId);
      };
      fr.readAsText(file);
    });
  }
});

// Get rid of current replays in table and data.
$("#reset").click(function() {
  $("#no-results").show();
  $("#results").hide();
  $('.replay-row').remove();
  showingResults = false;
  replayData = [];
  $('#validate').prop("disabled", true);
  $('#reset').prop("disabled", true);
  showMessage("Replays reset.");
});

$("#validate").click(function() {
  $("#validate").prop("disabled", true);
  replayData.forEach(function(replay) {
    update_row(replay.name, "Validating...");
    validateReplay(replay.data, function(valid) {
      if (valid) {
        update_row(replay.name, "Valid.");
      } else {
        update_row(replay.name, "Error.");
      }
    });
  });
});
