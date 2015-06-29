util = require "./util"
file = require "./file"

class Create

  @contract: (config, name, callback) ->
    config.expect(config.contracts.directory, "contracts directory")

    from = config.example.contract.filename
    to = "#{config.contracts.directory}/#{name}.sol"

    file.duplicate from, to, (err) ->
      if err?
        callback(err)
        return

      file.replace to, config.example.contract.name, name, callback

  @test: (config, name, callback) ->
    config.expect(config.tests.directory, "tests directory")

    underscored = util.toUnderscoreFromCamel(name)
    from = config.example.test.filename
    to = "#{config.tests.directory}/#{underscored}.coffee"

    file.duplicate from, to, (err) ->
      if err?
        callback(err)
        return

      file.replace to, config.example.contract.name, name, () ->
        file.replace to, config.example.contract.variable, underscored, callback

module.exports = Create