goodygood_274

subj: TPR

Two parts to my update. Part 1: Some testing. You can see my most recent version [here](https://github.com/chrahunt/TagProReplays/tree/use-new-format) which includes testing along with a number of other changes.

Part 2: Validation. Specifically, replay format validation using json-schema. I've got a zipfile with what I've been using as kind of my schema validation test files [here]() that you can check out.

Hey! Just wanted to let you know I'm still around. With graduation coming up I've been busy. Over the weekend I was looking at what we've been working on and have made some headway in validating JSON. I've laid out the specifications for the current replay format as well as the replay format that we'll be transitioning to in [JSON Schema](http://json-schema.org) format, and using that along with a validation library has been extremely helpful in showing me the way forward. The benefits will be two-fold:

* It is now possible to test that incoming imported replays of any version have everything we expect, in a way that doesn't suck to maintain or troubleshoot.
* The schema written for new replays can act as a form of documentation of the format, as well as a method for testing that the old-replay to new-replay transformation functions (both the one for the database upgrade and the one for imported replays) work properly and adhere to our expectations.

I've also implemented testing for the migration functions, so we can be assured that the functions that will transform the database apply things only as-needed and in the correct order. By testing, I was actually able to find a bugs that would have taken much longer (and been way more boring) to find manually.

There are several areas that I'm afraid I've jumped ahead in implementing and I want you to know that at any point I am A-OK with spending time going over anything I've done that would otherwise demand time from you to get familiar with. Examples being: npm, JSON Schema, mochajs, to name a few. Let me know when you've got If you've got some time, the guide [here](http://spacetelescope.github.io/understanding-json-schema/index.html) gives a great overview of JSON Schema, and the library I'm using for validation is [ZSchema](). Additionally, if you want to run the things that I set up, are you familiar with NodeJS at all? npm?
