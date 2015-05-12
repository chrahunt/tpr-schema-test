var validate = require('./validate');

var data = require('./newdata/20150425-test.json');

var valid = validate(3, data);
if (valid) {
  console.log("Good!");
}
