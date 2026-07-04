/**
 * auth-security — LJ Educare
 * Region: asia-south1   Database: (default)
 *
 * Exports:
 *   - syncRoleClaims            (firestore)  mirror users/{uid} role/perms into custom claims
 *   - assignStudentId           (firestore)  stamp LJE####XX studentId on new student docs
 *   - recordLoginEvent          (callable)   register a sign-in/session
 *   - bumpTokenVersion          (callable)   revoke tokens after credential changes
 *   - forceLogoutUser           (callable)   admin force-logout
 *   - createKioskPairingCode    (callable)   main_admin issues a device pairing code
 *   - exchangeKioskPairingCode  (callable)   device swaps code → custom token (role: kiosk)
 */
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

setGlobalOptions({ region: 'asia-south1' });
if (!admin.apps.length) admin.initializeApp();

const { syncRoleClaims } = require('./lib/claims');
const { assignStudentId } = require('./lib/studentId');
const { recordLoginEvent, bumpTokenVersion, forceLogoutUser } = require('./lib/loginEvents');
const { createKioskPairingCode, exchangeKioskPairingCode } = require('./lib/kiosk');

exports.syncRoleClaims = syncRoleClaims;
exports.assignStudentId = assignStudentId;
exports.recordLoginEvent = recordLoginEvent;
exports.bumpTokenVersion = bumpTokenVersion;
exports.forceLogoutUser = forceLogoutUser;
exports.createKioskPairingCode = createKioskPairingCode;
exports.exchangeKioskPairingCode = exchangeKioskPairingCode;
