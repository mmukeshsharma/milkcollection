import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect users from the root URL to the dashboard page
  redirect('/dashboard');
}
