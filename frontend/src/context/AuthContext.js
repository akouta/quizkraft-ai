import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { createUserDoc } from "../firebase/firebaseAuth";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (user) {
          // Refresh the user's token to ensure we see any updated emailVerified state
          await user.reload();

          // If they have verified their email, let's ensure they have a user doc
          if (user.emailVerified) {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            // Only create the doc if it doesn't exist
            if (!docSnap.exists()) {
              // You can pass more data as needed
              await createUserDoc(user.uid, { email: user.email });
            }
          }

          setCurrentUser(user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe; // Clean up the listener
  }, []);

  const value = { currentUser };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
