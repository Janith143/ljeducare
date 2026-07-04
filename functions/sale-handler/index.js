/**
 * sale-handler — LJ Educare financial core
 * Region: asia-south1   Database: (default)
 *
 * Callables:
 *   - initiateEnrollment   student starts an enrollment (free / gateway / slip)
 *   - attachPaymentSlip    student attaches an uploaded bank slip
 *   - approveSlipSale      admin ('requests') settles a slip payment
 *   - rejectSlipSale       admin ('requests') rejects a slip payment
 *   - getTeacherBalance    admin ('revenue') reads owed commission + cash
 *   - payTeacher           admin ('revenue') Pay & Reset settlement
 *
 * All settlement paths converge on lib/finalize.js (single transaction:
 * sale completed + enrollment + commission split + ledger).
 */
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

setGlobalOptions({ region: 'asia-south1' });
if (!admin.apps.length) admin.initializeApp();

const { initiateEnrollment } = require('./lib/enroll');
const { initiateCartCheckout } = require('./lib/cart');
const { attachPaymentSlip, attachOrderSlip, approveSlipSale, rejectSlipSale } = require('./lib/slip');
const { payTeacher, getTeacherBalance } = require('./lib/teacherPay');
const { paypalCreateOrder, paypalCaptureOrder } = require('./lib/paypal/orders');
const { paypalCreateCartOrder, paypalCaptureCartOrder } = require('./lib/paypal/cartOrders');
const { paypalWebhook } = require('./lib/paypal/webhook');
const { markAttendance, getSessionAttendance } = require('./lib/attendance');
const { submitQuiz } = require('./lib/quiz');
const { issueCertificate } = require('./lib/certificates');

exports.initiateEnrollment = initiateEnrollment;
exports.initiateCartCheckout = initiateCartCheckout;
exports.attachPaymentSlip = attachPaymentSlip;
exports.attachOrderSlip = attachOrderSlip;
exports.approveSlipSale = approveSlipSale;
exports.rejectSlipSale = rejectSlipSale;
exports.getTeacherBalance = getTeacherBalance;
exports.payTeacher = payTeacher;
exports.paypalCreateOrder = paypalCreateOrder;
exports.paypalCaptureOrder = paypalCaptureOrder;
exports.paypalCreateCartOrder = paypalCreateCartOrder;
exports.paypalCaptureCartOrder = paypalCaptureCartOrder;
exports.paypalWebhook = paypalWebhook;
exports.markAttendance = markAttendance;
exports.getSessionAttendance = getSessionAttendance;
exports.submitQuiz = submitQuiz;
exports.issueCertificate = issueCertificate;
