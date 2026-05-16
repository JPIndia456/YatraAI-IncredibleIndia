import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 bg-[#FDFDFB] text-[#000080]">
      <p className="text-6xl sm:text-7xl font-bold text-[#FF9933]/90 mb-2">404</p>
      <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-3">Page not found</h1>
      <p className="text-center text-[#000080]/75 max-w-md mb-8 text-sm sm:text-base">
        That route does not exist or may have moved. Head home to plan your journey.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-[#FF9933] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#e88a2e] transition-colors"
      >
        Back to Yatra
      </Link>
    </div>
  );
}
