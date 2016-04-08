var Util = {
  toUnderscoreFromCamel: function(string) {
    string = string.replace(/([A-Z])/g, function($1) {
      return "_" + $1.toLowerCase();
    });

    if (string[0] == "_") {
      string = string.substring(1);
    }

    return string;
  }
}

module.exports = Util;
