import { useState } from 'react';
import axios from 'axios';
import { STRIPE_PRICE_ID, STRIPE_PK } from '../../shared/stripe';
import { useNavigate } from 'react-router-dom';

export default function Activate() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleActivate = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In production, redirect to Stripe checkout
      if (import.meta.env.PROD) {
        const stripe = await import('@stripe/stripe-js').then((m) => m.loadStripe(STRIPE_PK));
        if (!stripe) throw new Error('Failed to load Stripe');

        const { error } = await stripe.redirectToCheckout({
          lineItems: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
          mode: 'subscription',
          successUrl: `${window.location.origin}/#/activate-success?email=${encodeURIComponent(email)}`,
          cancelUrl: `${window.location.origin}/#/activate`,
          customerEmail: email,
        });

        if (error) {
          throw error;
        }
      } else {
        // In development, use the local license server
        const response = await axios.post('http://localhost:4100/activate', { email });
        const { licenceKey } = response.data;

        // Store the key
        localStorage.setItem('abai_licence_key', licenceKey);

        // Navigate within the SPA so the hash prefix is automatically handled by HashRouter
        navigate('/activate-success');
      }
    } catch (err: any) {
      setError(err.message || 'Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Activate ABAI</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email to activate your ABAI license
          </p>
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

          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Activate License'}
          </button>
        </div>
      </div>
    </div>
  );
}
