class Util
  @toUnderscoreFromCamel = (string) ->
    string = string.replace /([A-Z])/g, ($1) ->
      return "_" + $1.toLowerCase()

    if string[0] == "_"
      string = string.substring(1)

    string

module.exports = Util