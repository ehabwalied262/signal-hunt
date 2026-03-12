import { redirect } from 'next/navigation';

/**
 * Root page — redirect to leads dashboard or login.
 */
export default function Home() {
  redirect('/leads');
}
