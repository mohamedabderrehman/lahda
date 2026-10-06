import { useEffect } from 'react';
import { router } from 'expo-router';

/** Redirect to Toters-style flow: pick location then add details */
export default function AddAddressRedirect() {
  useEffect(() => {
    router.replace('/addresses/pick-location');
  }, []);
  return null;
}
