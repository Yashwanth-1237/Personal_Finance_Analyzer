import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';
import { ReceiptIllustration } from '../components/Illustrations';

export default function NotFoundPage() {
  return (
    <div className="center-screen">
      <EmptyState
        illustration={<ReceiptIllustration />}
        title="Page not found"
        text="The page you are looking for does not exist."
        action={<Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>}
      />
    </div>
  );
}
