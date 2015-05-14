var replays = [
  {
    name: "replays1415577218207.json",
    path: "..\\data\\replays1415577218207.json"
  }/*,
  {
    name: "replays1415577218207-missing.json",
    path: "..\\validation\\replays1415577218207-missing.json"
  }*/
];

replays.forEach(function(info) {
  $.getJSON(info.path, function(data) {
    var replay = {
      name: info.name,
      data: data
    };
    convertReplay(replay, function(err) {
      // Breakpoint here for testing.
      console.log("Replay name: " + replay.data.info.name + ".");
      console.assert(!err, "There should not be an error.");
    });
  });
});
