import { doc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function saveQuizToHistory(userId, quizData) {
  try {
    // Reference to the user's quizzes collection
    const userDoc = doc(db, "users", userId);
    const quizzesCollection = collection(userDoc, "quizzes");

    // Add the quiz data with a server-generated timestamp
    await addDoc(quizzesCollection, {
      ...quizData, // Include quiz questions, source, settings, etc.
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    throw error; // Propagate the error for further handling if needed
  }
}
