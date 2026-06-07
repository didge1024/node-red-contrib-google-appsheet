const { createSchema } = require('./lib/schema-validator');

module.exports = function (RED) {
  function AppSheetSchema(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.configNode = RED.nodes.getNode(config.configNodeId);
    this.tableName = config.tableName;
    this.columns = {};

    // Parse saved column definitions from config
    try {
      if (config.columns) {
        this.columns = JSON.parse(config.columns);
      }
    } catch (err) {
      node.error('Invalid column configuration: ' + err.message);
    }

    if (Object.keys(this.columns).length > 0) {
      // Build schema and store in flow context
      var schema = createSchema(this.tableName, this.columns);
      node.context().flow.set('appsheet_schema_' + this.tableName, schema);
      node.status({ fill: 'green', shape: 'dot', text: this.tableName + ' (' + Object.keys(this.columns).length + ' cols)' });
    } else {
      node.status({ fill: 'yellow', shape: 'ring', text: 'no columns defined' });
    }

    node.on('input', function (msg) {
      if (Object.keys(node.columns).length > 0) {
        var schema = createSchema(node.tableName, node.columns);
        node.context().flow.set('appsheet_schema_' + node.tableName, schema);
        msg.schema = schema;
        node.send(msg);
      } else {
        node.warn('No columns defined — configure the schema first');
      }
    });
  }

  // Editor endpoint: fetch columns from a sample row
  RED.httpAdmin.post('/appsheet-schema/fetch-columns', RED.auth.needsPermission('appsheet-schema.write'), function (req, res) {
    var configNodeId = req.body.configNodeId;
    var tableName = req.body.tableName;
    var configNode = RED.nodes.getNode(configNodeId);

    if (!configNode) {
      res.status(400).json({ error: 'Config node not found. Deploy the flow first.' });
      return;
    }

    var appId = configNode.appId;
    var accessKey = configNode.credentials.accessKey;

    if (!appId || !accessKey) {
      res.status(400).json({ error: 'App ID or Access Key not configured' });
      return;
    }

    var { createClient } = require('./lib/appsheet-client');
    var client = createClient(appId, accessKey);

    client.request({
      tableName: tableName,
      action: 'Find',
      properties: { Selector: 'TOP([' + tableName + '], 1)' },
      rows: []
    }).then(function (data) {
      if (data.Rows && data.Rows.length > 0) {
        var columns = Object.keys(data.Rows[0]).filter(function (k) {
          return k !== '_RowNumber';
        });
        res.json({ columns: columns });
      } else {
        res.json({ columns: [], warning: 'Table returned no rows' });
      }
    }).catch(function (err) {
      res.status(500).json({ error: err.message || 'Failed to fetch columns' });
    });
  });

  RED.nodes.registerType('appsheet-schema', AppSheetSchema);
};
