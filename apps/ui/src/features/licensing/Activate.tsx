import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Stripe Payment Link for $1 test product
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/5kQ8wQ2Nba1S95095D7IY01';

export default function Activate() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'purchase' | 'retrieve'>('purchase');
  const navigate = useNavigate();

  const handlePurchase = () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Store email for later retrieval
    localStorage.setItem('abai_purchase_email', email);

    // Redirect to Stripe payment link
    window.location.href = `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(email)}`;
  };

  const handleRetrieveLicense = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Try to retrieve license from server
      const serverUrl = import.meta.env.PROD
        ? 'https://license.spventerprises.com'
        : 'http://localhost:4100';

      const response = await axios.post(`${serverUrl}/retrieve-license`, { email });

      if (response.data.licenseKey) {
        // Store the license key
        if (window.api?.storeLicense) {
          await window.api.storeLicense(response.data.licenseKey);
        }

        // Store email for future reference
        localStorage.setItem('abai_license_email', email);

        // Navigate to success page with email parameter
        navigate(`/activate-success?email=${encodeURIComponent(email)}`);
      } else {
        setError(
          'No license found for this email. Please check your email or purchase a new license.'
        );
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(
          'No license found for this email. Please check your email or purchase a new license.'
        );
      } else {
        setError(
          'Unable to retrieve license. Please check your internet connection and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {mode === 'purchase' ? 'Purchase ABAI License' : 'Retrieve Your License'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {mode === 'purchase'
              ? 'Enter your email to purchase your ABAI license'
              : 'Enter the email you used to purchase your license'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setMode('purchase')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              mode === 'purchase'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Purchase New
          </button>
          <button
            onClick={() => setMode('retrieve')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              mode === 'retrieve'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Already Purchased
          </button>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          {error && <div className="text-red-600 text-sm text-center">{error}</div>}

          {mode === 'purchase' ? (
            <>
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Purchase License ($1)
              </button>
              <p className="text-xs text-center text-gray-500">
                You will be redirected to Stripe for secure payment
              </p>
            </>
          ) : (
            <>
              <button
                onClick={handleRetrieveLicense}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Retrieving...' : 'Retrieve License'}
              </button>
              <p className="text-xs text-center text-gray-500">
                License will be retrieved from our server
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
