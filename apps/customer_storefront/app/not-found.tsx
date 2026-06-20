import Link from 'next/link';
import { Button } from './components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">🔍</div>
      <h1 className="text-xl font-extrabold mb-2">Page not found</h1>
      <p className="text-sm text-[#78716c] mb-6 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href="/">
        <Button>Start Shopping</Button>
      </Link>
    </div>
  );
}