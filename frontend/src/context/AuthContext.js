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
        if (!user) {
          setCurrentUser(null);
          return;
        }

        if (user.emailVerified) {
          await user.getIdToken(true);
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            await createUserDoc(user.uid, {
              email: user.email,
              displayName: user.displayName || "",
            });
          }
        }

        setCurrentUser(user);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const refreshUser = async () => {
    if (!auth.currentUser) {
      setCurrentUser(null);
      return null;
    }

    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const refreshedUser = auth.currentUser;
    setCurrentUser(refreshedUser);

    if (refreshedUser?.emailVerified) {
      const userDocRef = doc(db, "users", refreshedUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await createUserDoc(refreshedUser.uid, {
          email: refreshedUser.email,
          displayName: refreshedUser.displayName || "",
        });
      }
    }

    return refreshedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isVerified: Boolean(currentUser?.emailVerified),
        loading,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
