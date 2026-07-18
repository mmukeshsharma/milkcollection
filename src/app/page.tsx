import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect users from the root URL to the home application launcher grid page
  redirect('/home');
}
