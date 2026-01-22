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
			photo_url: user.photoURL,
			is_onboarded: false,
			rating: 1600,
			total_matches: 0,
			total_wins: 0,
			recent_results: [],
			created_at: serverTimestamp(),
			updated_at: serverTimestamp(),
		});
		return { isNewUser: true };
	}

	// providerDataから最新のphotoURLを取得（Googleで画像変更時に反映される）
	const latestPhotoURL = user.providerData[0]?.photoURL || user.photoURL;
	if (latestPhotoURL) {
		await updateDoc(userRef, {
			photo_url: latestPhotoURL,
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
): Promise<
	{
		display_name?: string;
		is_onboarded?: boolean;
		photo_url?: string;
		rating?: number;
		total_matches?: number;
		total_wins?: number;
		recent_results?: Array<{
			match_id?: string;
			result?: "win" | "loss" | "invalid";
			matched_at?: { toDate?: () => Date };
			rating_delta?: number;
		}>;
	} | null
> {
	const userRef = doc(db, "users", uid);
	const userSnap = await getDoc(userRef);
	if (userSnap.exists()) {
		return userSnap.data() as {
			display_name?: string;
			is_onboarded?: boolean;
			photo_url?: string;
			rating?: number;
			total_matches?: number;
			total_wins?: number;
			recent_results?: Array<{
				match_id?: string;
				result?: "win" | "loss" | "invalid";
				matched_at?: { toDate?: () => Date };
				rating_delta?: number;
			}>;
		};
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
