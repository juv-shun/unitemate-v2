import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function ensureUserExists(user: User) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      display_name: user.displayName || "Unknown User",
      email: user.email,
      photo_url: user.photoURL,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }
}

export async function updateDisplayName(uid: string, name: string) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    display_name: name,
    updated_at: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data();
  }
  return null;
}
