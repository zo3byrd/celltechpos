/**
 * WebPOS integration stub.
 * Replace with real terminal API calls once credentials are provisioned.
 */

const BASE_URL    = process.env.WEBPOS_API_URL;
const API_KEY     = process.env.WEBPOS_API_KEY;
const TERMINAL_ID = process.env.WEBPOS_TERMINAL_ID;

async function _post(endpoint, body) {
  console.log('[WEBPOS STUB] POST', endpoint, body);
  return { success: true, referenceNumber: `WP-${Date.now()}`, approved: true, authCode: 'AUTH123' };
}

module.exports = {
  async processPayment({ amount, reference, paymentType = 'card' }) {
    return _post('/payment/process', { terminalId: TERMINAL_ID, amount, reference, paymentType });
  },

  async voidPayment(referenceNumber) {
    return _post('/payment/void', { terminalId: TERMINAL_ID, referenceNumber });
  },

  async refundPayment({ referenceNumber, amount }) {
    return _post('/payment/refund', { terminalId: TERMINAL_ID, referenceNumber, amount });
  },

  async getTerminalStatus() {
    return { terminalId: TERMINAL_ID, status: 'online', batteryLevel: 100 };
  },
};
