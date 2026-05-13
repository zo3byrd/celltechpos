/**
 * Vidapay integration stub.
 * Replace stub methods with real API calls once credentials are available.
 * Docs: contact your Vidapay dealer support representative.
 */

const BASE_URL  = process.env.VIDAPAY_API_URL;
const API_KEY   = process.env.VIDAPAY_API_KEY;
const DEALER_ID = process.env.VIDAPAY_DEALER_ID;

async function _post(endpoint, body) {
  console.log('[VIDAPAY STUB] POST', endpoint, body);
  return { success: true, referenceId: `VIDA-${Date.now()}`, message: 'Stub response' };
}

async function _get(endpoint) {
  console.log('[VIDAPAY STUB] GET', endpoint);
  return { success: true };
}

module.exports = {
  async processActivation({ carrier, activationType, phoneNumber, imei, planName, planCost, simNumber }) {
    return _post('/dealer/activate', { dealerId: DEALER_ID, carrier, activationType, phoneNumber, imei, planName, planCost, simNumber });
  },

  async getPlans(carrier) {
    return {
      plans: [
        { id: 'vp1', name: 'Boost $15 International Talk', cost: 15.00 },
        { id: 'vp2', name: 'Boost $25 Basic',              cost: 25.00 },
        { id: 'vp3', name: 'Boost $35 Plus',               cost: 35.00 },
        { id: 'vp4', name: 'Boost $50 Premium',            cost: 50.00 },
        { id: 'vp5', name: 'Boost $60 Unlimited+',         cost: 60.00 },
      ],
      carrier: carrier || 'boost',
    };
  },

  async getDealerBalance() {
    return { balance: 500.00, currency: 'USD', dealerId: DEALER_ID };
  },

  async checkStatus(referenceId) {
    return { referenceId, status: 'approved' };
  },

  async portCheck(phoneNumber) {
    return { eligible: true, carrier: 'Unknown', phoneNumber };
  },
};
