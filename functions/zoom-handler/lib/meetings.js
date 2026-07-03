/**
 * createZoomMeeting — schedules (or updates) a security-hardened Zoom meeting
 * on the teacher's connected account. Called from the class editor.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { apiCall } = require('./client');
const { getSecrets } = require('./store');
const { authorizeStaff, SECRETS } = require('./oauth');

const createZoomMeeting = onCall({ secrets: SECRETS }, async (request) => {
    const { staffId, title, date, startTime, endTime, meetingId } = request.data || {};
    if (!staffId || !title || !date || !startTime || !endTime) {
        throw new HttpsError('invalid-argument', 'staffId, title, date, startTime, endTime required');
    }
    const staff = await authorizeStaff(request, staffId);
    if (!(await getSecrets(staffId)).zoomRefreshToken) {
        throw new HttpsError('failed-precondition', 'Connect your Zoom account first.');
    }

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const duration = Math.max(15, eh * 60 + em - (sh * 60 + sm));

    const payload = {
        topic: String(title).slice(0, 200),
        type: 2, // scheduled
        start_time: `${date}T${startTime}:00`,
        duration,
        timezone: 'Asia/Colombo',
        settings: {
            approval_type: 1, // manually approve registrants → blocks public link sharing
            registration_type: 1, // registration required
            registrants_email_notification: false,
            auto_recording: staff.zoomAutoRecordEnabled === false ? 'none' : 'cloud',
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: false,
            show_share_button: false,
            allow_multiple_devices: false, // one device per join link
        },
    };

    let result;
    if (meetingId) {
        // Reuse: PATCH then GET (preserves id + stable join link + registrant cache).
        try {
            await apiCall(staffId, 'PATCH', `/meetings/${meetingId}`, payload);
            result = await apiCall(staffId, 'GET', `/meetings/${meetingId}`);
        } catch {
            result = null; // stale/deleted — mint a fresh one below
        }
    }
    if (!result) {
        result = await apiCall(staffId, 'POST', `/users/${staff.zoomUserId}/meetings`, payload);
    }

    return {
        meetingId: String(result.id),
        joinUrl: result.join_url,
        startUrl: result.start_url,
    };
});

/** Fetch the host start_url for a class the teacher owns (host launch button). */
const getZoomStartUrl = onCall({ secrets: SECRETS }, async (request) => {
    const { staffId, meetingId } = request.data || {};
    if (!staffId || !meetingId) throw new HttpsError('invalid-argument', 'staffId, meetingId required');
    await authorizeStaff(request, staffId);
    const m = await apiCall(staffId, 'GET', `/meetings/${meetingId}`);
    return { startUrl: m.start_url };
});

module.exports = { createZoomMeeting, getZoomStartUrl };
