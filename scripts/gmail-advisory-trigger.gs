/**
 * WattSnap: tell the app to check ANTECO's Facebook page when Facebook emails about a new post.
 *
 * Paste this file into script.google.com while signed in as the project's Gmail account, then
 * follow docs/13-anteco-advisory-ingestion.md. It needs two Script Properties
 * (Project Settings > Script Properties). Neither value belongs in this file:
 *   WEBHOOK_URL   https://<your site>/api/advisories/ingest
 *   CRON_SECRET   the same value as CRON_SECRET in Vercel
 *
 * The email is only a signal. Its contents are never sent anywhere: the app reads ANTECO's
 * public page itself and skips posts it already has. Only the time the email arrived is sent.
 */

// Facebook notification mail about ANTECO from the last day that has not been handled yet.
// Adjust the words in brackets to the real sender and subject once a few emails have arrived.
var SEARCH = 'from:facebookmail.com newer_than:1d -label:wattsnap-handled (ANTECO OR "Antique Electric Cooperative")';
var HANDLED_LABEL = 'wattsnap-handled';

/** Runs every minute from a time-driven trigger. */
function checkMail() {
  var threads = GmailApp.search(SEARCH, 0, 20);
  if (!threads.length) return;
  var newest = 0, seen = {};
  for (var i = 0; i < threads.length; i++) {
    seen[threads[i].getId()] = threads[i].getLastMessageDate().getTime();
    newest = Math.max(newest, seen[threads[i].getId()]);
  }
  var answer = ping_(newest);
  // A notification is handled only when the app says it has fetched new posts since the email
  // arrived, or says not to send this signal again today. "Accepted" is not enough: that run
  // can still fail, so the mail stays and the next minute asks again.
  if (answer.served || answer.retry === false) {
    var label = GmailApp.getUserLabelByName(HANDLED_LABEL) || GmailApp.createLabel(HANDLED_LABEL);
    // A thread that received another notification while the app was being asked is left for the
    // next minute: that newer email has not been answered for.
    for (var id in seen) {
      var thread = GmailApp.getThreadById(id);
      if (thread && thread.getLastMessageDate().getTime() === seen[id]) label.addToThread(thread);
    }
  }
}

/** Run by hand from the editor to check the two properties. The log should show 202 or 409. */
function testPing() {
  Logger.log(JSON.stringify(ping_(0)));
}

/** `since` is when the newest notification arrived, in milliseconds; 0 to leave it out. */
function ping_(since) {
  var properties = PropertiesService.getScriptProperties();
  var url = properties.getProperty('WEBHOOK_URL'), secret = properties.getProperty('CRON_SECRET');
  if (!url || !secret) throw new Error('Set WEBHOOK_URL and CRON_SECRET in Project Settings > Script Properties.');
  try {
    var response = UrlFetchApp.fetch(url + (since ? '?since=' + since : ''), { method: 'post', headers: { Authorization: 'Bearer ' + secret }, muteHttpExceptions: true });
    var status = response.getResponseCode(), body = {};
    try { body = JSON.parse(response.getContentText()) || {}; } catch (error) { /* Not JSON: treated as "try again". */ }
    Logger.log('WattSnap answered ' + status + (body.reason ? ' (' + body.reason + ')' : body.served ? ' (served)' : ''));
    return { status: status, accepted: status === 202 && body.accepted === true, served: status === 200 && body.served === true, retry: body.retry };
  } catch (error) {
    Logger.log('WattSnap could not be reached: ' + error);
    return { status: 0, accepted: false, served: false, retry: true };
  }
}
