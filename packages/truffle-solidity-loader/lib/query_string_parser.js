// Convert a Query String into an object of key value pairs.
var QueryStringParser = {
  parse: function(query) {
    var queryString = {};

    query.replace(
      new RegExp("([^?=&]+)(=([^&]*))?", "g"),
      function($0, $1, $2, $3) { queryString[$1] = $3; }
    );

    return queryString;
  }
}

module.exports = QueryStringParser;
