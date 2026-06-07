const { createClient } = require('./lib/appsheet-client');
const { createSchema } = require('./lib/schema-validator');

module.exports = function (RED) {
  function AppSheet(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.configNode = RED.nodes.getNode(config.configNodeId);

    if (!this.configNode) {
      node.status({ fill: 'red', shape: 'ring', text: 'missing config' });
      return;
    }

    var appId = this.configNode.appId;
    var accessKey = this.configNode.credentials.accessKey;

    if (!appId || !accessKey) {
      node.status({ fill: 'red', shape: 'ring', text: 'missing credentials' });
      return;
    }

    var client = createClient(appId, accessKey);
    node.status({});

    node.on('input', function (msg, send, done) {
      send = send || function () { node.send.apply(node, arguments); };
      done = done || function (err) { if (err) node.error(err, msg); };

      var tableName = msg.table || config.tableName;
      var action = msg.action || config.action;
      var selector = msg.selector || config.selector || '';
      var actionName = msg.actionName || config.actionName || '';
      var properties = msg.properties || {};

      if (!tableName) {
        node.status({ fill: 'red', shape: 'dot', text: 'no table specified' });
        done(new Error('No table specified'));
        return;
      }
      if (!action) {
        node.status({ fill: 'red', shape: 'dot', text: 'no action specified' });
        done(new Error('No action specified'));
        return;
      }

      // Look up schema from flow context or msg
      var schema = msg.schema || node.context().flow.get('appsheet_schema_' + tableName);
      var hasSchema = schema && schema.columns && Object.keys(schema.columns).length > 0;

      if (!hasSchema) {
        node.status({ fill: 'yellow', shape: 'ring', text: 'no schema — passthrough mode' });
      }

      // Determine the API action name
      var apiAction = action === 'Action' ? actionName : action;

      // Build rows
      var rows = [];
      if (action === 'Find') {
        if (selector) {
          properties.Selector = selector;
        }
      } else {
        var payload = msg.payload;
        if (payload !== null && payload !== undefined) {
          rows = Array.isArray(payload) ? payload : [payload];
        }
      }

      // Validate and coerce if schema is available
      if (hasSchema && (action === 'Add' || action === 'Edit' || action === 'Delete')) {
        var validation = schema.validate(rows, action);
        if (!validation.valid) {
          msg.payload = { errors: validation.errors, originalPayload: msg.payload };
          send([null, msg]);
          done();
          return;
        }

        if (action === 'Delete') {
          // For delete, only send key field
          rows = rows.map(function (row) {
            var keyOnly = {};
            if (schema.keyField && row[schema.keyField] !== undefined) {
              keyOnly[schema.keyField] = row[schema.keyField];
            }
            return keyOnly;
          });
        } else {
          var formatted = schema.formatForApi(rows);
          if (formatted.errors.length > 0) {
            msg.payload = { errors: formatted.errors, originalPayload: msg.payload };
            send([null, msg]);
            done();
            return;
          }
          rows = formatted.rows;
        }
      }

      node.status({ fill: 'blue', shape: 'dot', text: action + '...' });

      client.request({
        tableName: tableName,
        action: apiAction,
        properties: properties,
        rows: rows
      }).then(function (data) {
        if (action === 'Find' && hasSchema && data.Rows) {
          msg.raw = data;
          msg.payload = schema.parseResponse(data.Rows);
        } else {
          msg.payload = data;
        }
        node.status({ fill: 'green', shape: 'dot', text: action + ' OK' });
        send([msg, null]);
        done();
      }).catch(function (err) {
        node.status({ fill: 'red', shape: 'dot', text: err.message || 'error' });
        msg.error = err;
        done(err.message || err);
      });
    });
  }

  RED.nodes.registerType('appsheet', AppSheet);
};
