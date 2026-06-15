import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full flex flex-col items-center">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary hover:bg-slate-800 text-sm normal-case',
              card: 'border border-champagne/80 shadow-sm rounded-2xl bg-white',
            },
          }}
        />
      </div>
    </div>
  );
}
