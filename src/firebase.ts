import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-northeast1");

// エミュレータ接続（開発環境のみ）
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
if (useEmulator) {
	console.log("🔧 Firebase Emulators に接続しています...");
	connectAuthEmulator(auth, "http://localhost:9099", {
		disableWarnings: true,
	});
	connectFirestoreEmulator(db, "localhost", 8080);
	connectFunctionsEmulator(functions, "localhost", 5001);
	console.log("✅ Firebase Emulators に接続しました");
}

export default app;
