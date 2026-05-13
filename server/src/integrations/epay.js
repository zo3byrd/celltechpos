/**
 * Epay integration stub.
 * Replace stub methods with real API calls once credentials are available.
 * Docs: contact your Epay dealer support representative.
 */

const BASE_URL = process.env.EPAY_API_URL;
const API_KEY  = process.env.EPAY_API_KEY;

async function _post(endpoint, body) {
  // When real: const res = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  console.log('[EPAY STUB] POST', endpoint, body);
  return { success: true, referenceId: `EPAY-${Date.now()}`, message: 'Stub response' };
}

async function _get(endpoint) {
  console.log('[EPAY STUB] GET', endpoint);
  return { success: true };
}

module.exports = {
  async processActivation({ carrier, activationType, phoneNumber, imei, planName, planCost }) {
    return _post('/activations', { carrier, activationType, phoneNumber, imei, planName, planCost });
  },

  async getBalance() {
    const result = await _get('/account/balance');
    return { balance: 250.00, currency: 'USD', ...result };
  },

  async getPlans(carrier) {
    return {
      plans: [
        { id: 'p1', name: '$25 Unlimited Talk & Text', cost: 25.00, data: '1GB LTE' },
        { id: 'p2', name: '$35 Unlimited',             cost: 35.00, data: '5GB LTE' },
        { id: 'p3', name: '$50 Unlimited Premium',     cost: 50.00, data: '15GB LTE' },
      ],
      carrier,
    };
  },

  async checkActivationStatus(referenceId) {
    return { referenceId, status: 'approved', message: 'Stub approved' };
  },
};
