$.getJSON("..\\data\\replays1415577218207.json", function(data) {
  validateReplay(data, function(valid) {
    console.assert(valid, "Replay should be valid.");
  });
});

$.getJSON("replays1415577218207-missing.json", function(data) {
  validateReplay(data, function(valid) {
    console.assert(!valid, "Replay should be invalid.");
  });
});
