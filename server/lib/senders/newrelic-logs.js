const _ = require('lodash');
const request = require('request');
const url = require('url');
const loggingTools = require('auth0-log-extension-tools');

const config = require('../config');
const logger = require('../logger');

module.exports = () => {
  const sendLogs = (logs, callback) => {
    if (logs.length === 0) {
      callback();
    }

    try {
      request
        .post(config('NEWRELIC_HTTP_ENDPOINT'))
        .send(logs.map(log => JSON.stringify(log)).join('\n'))
        .set('Content-Type', 'application/json')
        .set('X-License-Key', config('NEWRELIC_LICENSEKEY'))
        .end(function(err, res) {
          if (err || res.statusCode < 200 || res.statusCode >= 400) {
            const error = res.error || err.response;
            const errText = error && error.text && error.text.replace(/<\/?[^>]+>/gi, '');

            return callback(errText || err || res.statusCode);
          }

          return callback();
        });
    } catch (e) {
      return callback(e);
    }
  };

  return (logs, callback) => {
    if (!logs || !logs.length) {
      return callback();
    }

    logger.info(`Sending ${logs.length} logs to New Relic Logs.`);

    const timestamp = new Date().toUTCString();
    const common = {
      "attributes": {
        "service": "auth0_logs",
        "hostname": config('AUTH0_DOMAIN')
      }
    };
    const body = [];
    const sendlogs = [];
    
    logs.forEach((log) => {
      const data = {
        timestamp: timestamp,
        messages: log
      };

      sendlogs.push(data);
    });

    body.push(_.extend(common, sendlogs));

    return sendLogs(body, callback);
  };
};

