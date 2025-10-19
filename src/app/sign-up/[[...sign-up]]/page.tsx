import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="w-full max-w-md">
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl',
            }
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          redirectUrl="/"
        />
      </div>
    </div>
  );
}
