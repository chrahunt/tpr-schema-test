$.getJSON(".\\data\\replays1415577218207.json", function(data) {
  console.log("Got data");
  console.log("Keys: " + Object.keys(data));
  validateReplay(data, function(valid) {
    console.log("Valid: " + valid);
  });
});
