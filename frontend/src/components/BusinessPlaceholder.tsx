import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface BusinessPlaceholderProps {
  description: string;
  onAddBusiness?: () => void;
}

export default function BusinessPlaceholder({ description, onAddBusiness }: BusinessPlaceholderProps) {
  const { isAuthenticated } = useAuth();
  const linkTo = isAuthenticated ? '/dashboard' : '/login';
  const linkText = isAuthenticated ? 'Back to dashboard →' : 'Log in to continue →';

  return (
    <div className="bg-card rounded-xl border p-8 text-center max-w-lg mx-auto">
      <h3 className="font-semibold text-lg">Add your first business</h3>
      <p className="text-muted mt-2 text-sm">{description}</p>
      <div className="flex flex-col gap-3 mt-6">
        {isAuthenticated && onAddBusiness && (
          <button
            onClick={onAddBusiness}
            className="inline-block px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
          >
            + Add Business
          </button>
        )}
        <Link to={linkTo} className="inline-block text-brand-600 font-medium hover:underline">
          {linkText}
        </Link>
      </div>
    </div>
  );
}
