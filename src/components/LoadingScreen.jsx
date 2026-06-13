export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <svg
          className="w-10 h-10 text-blush-300"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <div className="w-6 h-6 relative">
          <div className="absolute inset-0 rounded-full border-2 border-cream-300 border-t-blush-300 animate-spin" />
        </div>
      </div>
    </div>
  )
}
