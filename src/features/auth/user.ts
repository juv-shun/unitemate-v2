import type { User } from "firebase/auth";
import {
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
	updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

export async function ensureUserExists(
	user: User,
): Promise<{ isNewUser: boolean }> {
	if (!user) return { isNewUser: false };

	const userRef = doc(db, "users", user.uid);
	const userSnap = await getDoc(userRef);

	if (!userSnap.exists()) {
		await setDoc(userRef, {
			display_name: user.displayName || "Unknown User",
			email: user.email,
			photo_url: user.photoURL,
			is_onboarded: false,
			created_at: serverTimestamp(),
			updated_at: serverTimestamp(),
		});
		return { isNewUser: true };
	}

	if (user.photoURL) {
		await updateDoc(userRef, {
			photo_url: user.photoURL,
			updated_at: serverTimestamp(),
		});
	}

	return { isNewUser: false };
}

export async function updateDisplayName(
	uid: string,
	name: string,
): Promise<void> {
	const userRef = doc(db, "users", uid);
	await updateDoc(userRef, {
		display_name: name,
		updated_at: serverTimestamp(),
	});
}

export async function getUserProfile(
	uid: string,
): Promise<{ display_name?: string; is_onboarded?: boolean } | null> {
	const userRef = doc(db, "users", uid);
	const userSnap = await getDoc(userRef);
	if (userSnap.exists()) {
		return userSnap.data() as { display_name?: string; is_onboarded?: boolean };
	}
	return null;
}

export async function completeOnboarding(
	uid: string,
	displayName: string,
): Promise<void> {
	const userRef = doc(db, "users", uid);
	await updateDoc(userRef, {
		display_name: displayName,
		is_onboarded: true,
		updated_at: serverTimestamp(),
	});
}
