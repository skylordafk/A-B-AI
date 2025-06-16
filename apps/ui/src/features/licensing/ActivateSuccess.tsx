import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function ActivateSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [licenseKey, setLicenseKey] = useState<string | null>(null);

  const email = searchParams.get('email');

  useEffect(() => {
    const fetchLicense = async () => {
      if (!email) {
        setError('No email provided');
        setLoading(false);
        return;
      }

      try {
        // In production, the license should have been created via Stripe webhook
        // We need to fetch it from the server using the email
        const response = await axios.post(
          `${import.meta.env.PROD ? 'https://license.spventerprises.com' : 'http://localhost:4100'}/retrieve-license`,
          { email }
        );

        if (response.data.licenseKey) {
          const key = response.data.licenseKey;
          setLicenseKey(key);

          // Store the license key using Electron IPC
          if (window.api?.storeLicense) {
            await window.api.storeLicense(key);
          } else {
            // Fallback to localStorage for web environments
            localStorage.setItem('abai_licence_key', key);
          }
        } else {
          throw new Error('License not found for this email');
        }
      } catch (err: any) {
        console.error('License fetch error:', err);
        setError(err.message || 'Failed to fetch license');
      } finally {
        setLoading(false);
      }
    };

    fetchLicense();
  }, [email]);

  const handleContinue = () => {
    // Navigate back to the app
    window.location.hash = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Activating License...
          </h1>
          <p className="text-[var(--text-secondary)]">
            Please wait while we set up your A-B/AI license.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Activation Failed</h1>
          <p className="text-[var(--text-secondary)] mb-6">{error}</p>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Your payment was successful, but we couldn't activate your license automatically. Please
            contact support with your email: {email}
          </p>
          <button
            onClick={() => (window.location.hash = '/activate')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="text-center">
        <div className="text-green-500 text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">License Activated!</h1>
        <p className="text-[var(--text-secondary)] mb-4">
          Your A-B/AI license has been successfully activated.
        </p>
        {licenseKey && (
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            License Key: {licenseKey.substring(0, 8)}...
          </p>
        )}
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Continue to App
        </button>
      </div>
    </div>
  );
}
