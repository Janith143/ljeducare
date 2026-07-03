/**
 * zoom-handler — LJ Educare
 * Region: asia-south1   Database: (default)
 *
 * Per-teacher Zoom Pro accounts (OAuth + optional custom app), security-hardened
 * meetings, unique per-student registrant join links, and recording capture.
 *
 * Callables: zoomConnect, zoomDisconnect, zoomSetCustomApp, createZoomMeeting,
 *            getZoomStartUrl, joinZoomClass
 * HTTP:      zoomCallback (OAuth redirect), zoomWebhook (recording.completed)
 *
 * Secrets:   ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_WEBHOOK_SECRET
 * Env:       ZOOM_REDIRECT_URI (the deployed zoomCallback URL), PUBLIC_SITE_URL
 */
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

setGlobalOptions({ region: 'asia-south1' });
if (!admin.apps.length) admin.initializeApp();

const { zoomConnect, zoomCallback, zoomDisconnect, zoomSetCustomApp } = require('./lib/oauth');
const { createZoomMeeting, getZoomStartUrl } = require('./lib/meetings');
const { joinZoomClass } = require('./lib/join');
const { zoomWebhook } = require('./lib/webhook');

exports.zoomConnect = zoomConnect;
exports.zoomCallback = zoomCallback;
exports.zoomDisconnect = zoomDisconnect;
exports.zoomSetCustomApp = zoomSetCustomApp;
exports.createZoomMeeting = createZoomMeeting;
exports.getZoomStartUrl = getZoomStartUrl;
exports.joinZoomClass = joinZoomClass;
exports.zoomWebhook = zoomWebhook;
